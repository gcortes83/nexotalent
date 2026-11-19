# 04 · Integraciones: ingesta de vacantes, ERP/CRM/ATS, MCP, Calendly y pagos

## 1. Modelo canónico de vacante

Toda fuente externa se traduce a `CanonicalJob` (JSON Schema en `nexo-specs/schemas/canonical-job.json`):

```json
{
  "externalId": "REQ-2026-0042",
  "source": { "type": "sap_successfactors", "connectionId": "conn_01H..." },
  "title": "Backend Engineer Node.js",
  "description": "...",
  "positions": 3,
  "location": { "country": "MX", "city": "CDMX", "modality": "hybrid" },
  "salary": { "min": 55000, "max": 75000, "currency": "MXN", "period": "month" },
  "employmentType": "full_time",
  "seniority": "senior",
  "skills": [{ "name": "Node.js", "level": 4, "mustHave": true }],
  "status": "open",
  "closesAt": "2026-12-31"
}
```

`(organization_id, source_type, external_id)` es **único**: reimportar actualiza (upsert) en lugar de duplicar.

## 2. Canales de ingesta (1 o N vacantes)

```mermaid
flowchart LR
  A[API push<br/>POST /v1/jobs/imports] --> V
  B[Endpoint registrado<br/>pull programado] --> V
  C[CSV<br/>upload a S3 presigned] --> V
  D[PDF<br/>Textract + LLM split] --> V
  E[Conectores<br/>SAP · Workday · Salesforce · HubSpot · ATS] --> V
  F[MCP de proveedores] --> V
  V[ingestion-svc<br/>validar · normalizar · deduplicar] --> P[Preview + costo en créditos]
  P -->|confirmar| J[jobs-svc<br/>draft / published]
```

| Canal | Cómo funciona | Volumen |
|---|---|---|
| **API push** | `POST /v1/jobs/imports` con arreglo de 1..1,000 vacantes, header `Idempotency-Key`, auth API key o OAuth client credentials. Respuesta `202` con `importId`. | Alto |
| **Endpoint registrado (pull)** | El empleador registra URL, método, auth (API key/OAuth/Basic), formato (JSON/XML/RSS/HR-XML), mapeo de campos (JSONPath) y frecuencia (cron). Un worker hace *pull*, compara hash y aplica *upsert*. | Medio |
| **Webhook entrante** | URL única por conexión `POST /v1/hooks/{connectionId}` firmada con HMAC-SHA256. | Tiempo real |
| **CSV** | Plantilla descargable; upload a S3 con URL prefirmada; validación por fila (Zod) con reporte de errores descargable; preview editable. | 1..10,000 filas |
| **PDF** | Uno o varios PDFs; Textract si es escaneado; LLM segmenta en N vacantes y extrae campos con nivel de confianza; las de baja confianza quedan en `needs_review`. | 1..50 vacantes por PDF |
| **Formulario** | Alta manual con asistente IA que redacta la descripción y sugiere skills. | 1 |

**Estados de una importación:** `uploaded → parsing → validated → awaiting_confirmation → importing → completed | partially_failed | failed`.

**Cobro:** al confirmar, `billing-svc` reserva N créditos; si no alcanzan, se ofrece Stripe Checkout por la diferencia o guardar como `draft`.

## 3. Conectores empresariales (ACL + sincronización bidireccional)

```mermaid
flowchart LR
  subgraph integrations-svc
    reg[Connector registry]
    port[[Port: JobSourcePort / StatusSinkPort]]
    sap[SAP SuccessFactors adapter<br/>OData v2: JobRequisition, JobApplication]
    wd[Workday adapter<br/>Recruiting API]
    sf[Salesforce adapter<br/>REST + Change Data Capture]
    hs[HubSpot adapter<br/>Custom Objects + Webhooks]
    dyn[Dynamics 365 adapter]
    atsx[Greenhouse / Lever adapters]
    mcpc[Generic MCP client adapter]
    gen[Generic REST adapter<br/>mapeo JSONPath]
  end
  reg --> port
  port --- sap & wd & sf & hs & dyn & atsx & mcpc & gen
```

- **Inbound (vacantes):** cada adaptador implementa `JobSourcePort.fetchChanges(since)` → `CanonicalJob[]`.
- **Outbound (estatus):** `StatusSinkPort.pushStatus(externalApplicationId, canonicalStatus)` con **tabla de mapeo de estatus** configurable por conexión (p. ej. `interview_scheduled` → SAP `Interview`).
- **Credenciales** en AWS Secrets Manager por conexión; OAuth con *refresh* automático.
- **Resiliencia:** reintentos exponenciales con *jitter*, *circuit breaker* (opossum), DLQ y panel de errores en `nexo-admin`; reproceso manual.
- **Idempotencia:** `sync_cursor` por conexión y `external_id`.
- **SDK de conectores:** interfaz pública para agregar adaptadores nuevos sin tocar el núcleo (marketplace en fase 3).

## 4. MCP de proveedores de vacantes

El admin registra un servidor MCP externo: URL, transporte, credenciales y **mapeo de tools** (`search` → `fetchChanges`, `create_posting` → multiposting). El adaptador `mcpc` lista las tools disponibles (`tools/list`), valida que existan las requeridas y ejecuta la ingesta como cualquier otro conector. Compatible con cualquier proveedor que exponga un servidor MCP estándar.

## 5. Calendly y calendarios

```mermaid
sequenceDiagram
  participant R as Reclutador
  participant W as nexo-web
  participant S as scheduling-svc
  participant C as Calendly API v2
  participant Ca as Candidato
  R->>W: "Agendar entrevista" (postulación X)
  W->>S: POST /v1/interviews/scheduling-links
  S->>C: POST /scheduling_links (event_type del reclutador, max_event_count=1)
  C-->>S: booking_url
  S-->>Ca: Notificación con link (+ utm_content=applicationId, nombre y email precargados)
  Ca->>C: Elige horario
  C->>S: Webhook invitee.created (firma verificada)
  S->>S: Crea interview, publica interview.scheduled
  S-->>Ca: Evento en calendario (Google Calendar API o .ics)
```

- **Reclutador:** conecta su cuenta Calendly por OAuth; elige el *event type* por defecto (p. ej. "Entrevista técnica 45 min").
- **Webhooks:** suscripción a `invitee.created` e `invitee.canceled` a nivel organización; firma verificada con el *signing key*; se correlaciona por el parámetro de tracking.
- **Candidato:**
  - Vista **Calendario de entrevistas** en la app (mes/semana/lista).
  - **Sincronización con Google Calendar** vía OAuth (scope `calendar.events`): se inserta/actualiza/cancela el evento automáticamente.
  - **Feed ICS** personal (`webcal://.../ics/{token}.ics`) para Outlook/Apple Calendar.
  - Recordatorios 24 h y 1 h antes por push/WhatsApp.
- Al agendarse, la postulación avanza automáticamente a `interview_scheduled` (y vuelve a `shortlisted` si se cancela).

## 6. Pagos (Stripe)

- **Stripe Checkout** para paquetes y suscripciones; **Customer Portal** para facturas y tarjetas.
- **Payment Intents** con 3-D Secure; tarjetas nunca tocan nuestros servidores (PCI SAQ A).
- Webhooks: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.updated|deleted`, verificados con firma y procesados idempotentemente (`stripe_event_id` único).
- Ledger de créditos (`credit_ledger`) append-only: `+N` por compra, `−1` por publicación, reversos por reembolso.
- Facturación CFDI 4.0 (México) vía proveedor PAC en fase 2.
