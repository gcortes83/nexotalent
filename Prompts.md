# prompts.md · Documentación de NexoTalent AI

Prompts para generar **solo la documentación de diseño, arquitectura y técnica** de NexoTalent AI, más el `readme-updated.md` de entrega del curso (secciones 0 a 6, sin Pull Requests). Todos los documentos se generan en `nexo-specs/docs/`.

---

## Cómo usar este archivo

1. Ejecuta los prompts **en orden**: cada documento es contexto para los siguientes.
2. Antes de cada prompt, pega el **Prompt 0 · Brief del proyecto** (o asegúrate de que el agente ya lo tenga en contexto).
3. Usa **modo plan** en los prompts marcados con 🧭.
4. Después de cada prompt marcado con 🛡️, ejecuta el **Prompt R · Revisión adversarial** y corrige antes de continuar.
5. Los marcadores entre `{{ }}` son variables que debes sustituir.

**Leyenda:** 🧭 usar modo plan · 🛡️ requiere revisión adversarial.

| Prompt | Documento generado |
|---|---|
| P1.1 | `docs/01-vision-producto.md` |
| P1.2 | `docs/02-arquitectura.md` |
| P1.3 | `docs/03-arquitectura-ai.md` |
| P1.4 | `docs/04-integraciones.md` |
| P1.5 | `docs/05-eventos-notificaciones.md` |
| P1.6 | `docs/06-modelo-datos.md` |
| P1.7 | `docs/07-api.md` + contratos OpenAPI / AsyncAPI |
| P1.8 | `docs/08-frontend-ux.md` |
| P1.9 | `docs/09-seguridad-privacidad-etica.md` |
| P1.10 | `docs/10-estrategia-testing.md` |
| P1.11 | `docs/11-infraestructura-aws.md` |
| P1.12 | `docs/12-harness-sdd-guardrails.md` |
| P1.13 | `docs/13-historias-usuario.md` |
| P1.14 | `docs/14-tickets-trabajo.md` |
| P1.15 | `docs/15-roadmap.md` + `docs/README.md` |
| P1.16 | Revisión adversarial de toda la documentación |
| P1.17 | `readme-updated.md` |

---

## Prompt 0 · Brief del proyecto (contexto reutilizable)

```text
Eres un ingeniero de software senior que trabaja en NexoTalent AI, una plataforma de reclutamiento
AI-native. Contexto obligatorio:

PRODUCTO
- Conecta vacantes y candidatos por similitud semántica de skills (LLM + embeddings + pgvector).
- Candidato: importa o construye su CV, ve un radar de skills (vacante vs. candidato), postula manual o
  con auto-apply por reglas, sigue cada postulación con un stepper, tiene calendario de entrevistas
  (Calendly + Google Calendar/ICS) y recibe notificaciones in-app, email, WhatsApp y push.
- Empleador/reclutador: paga para publicar vacantes (Stripe), importa 1..N vacantes (API, endpoint
  registrado, CSV, PDF, conectores SAP/CRM/ATS, servidores MCP), revisa candidatos por match, cambia
  estatus, agenda entrevistas con Calendly, cierra vacantes (filled | cancelled | on_hold), ve
  posiciones disponibles y número de postulantes, recibe recordatorios a 3 y 5 días de postulaciones
  sin cambio (email, Slack, Teams, push).
- Admin de plataforma: administra usuarios, organizaciones, vacantes, candidatos, planes, integraciones.

ARQUITECTURA
- Polyrepo. Contratos SOLO en nexo-specs (OpenAPI, AsyncAPI, JSON Schema, OpenSpec, docs).
- Backend: Node.js 24 LTS, TypeScript estricto, Fastify, Drizzle ORM, Zod, arquitectura hexagonal,
  microservicios por bounded context, EDA con Amazon EventBridge + SQS (outbox, consumidores
  idempotentes, CloudEvents), BFF por canal (web/móvil) con endpoints agregados por pantalla.
- Datos: Aurora PostgreSQL 16 + pgvector (esquema por servicio, RLS), Redis/Valkey, S3.
- IA: Amazon Bedrock (Claude para razonamiento/extracción, embeddings 1024-d), RAG híbrido,
  servidor MCP propio y clientes MCP externos, agentes con límites.
- Frontend: React 19 + Vite + TypeScript, TanStack Router/Query, Tailwind v4, Radix, Recharts,
  Motion; design system en nexo-ui con Storybook. Look & feel moderno AI-native (dark-first, aurora
  gradient, señales ✦ de IA, streaming).
- AWS: CloudFront, WAF, ALB, ECS Fargate, Lambda, Cognito, EventBridge, SQS, SES, SNS, Textract,
  Bedrock, Secrets Manager, KMS; IaC con AWS CDK; CI/CD con GitHub Actions + OIDC.

REGLAS DE TRABAJO
- Spec Driven Development con OpenSpec: no implementes nada que no esté en un change aprobado.
- TDD: primero la prueba que falla; muéstrame el rojo antes de implementar.
- Pirámide de pruebas: unit (Vitest) > integración (Testcontainers) > contrato (Pact) > E2E (Playwright).
- Respeta los guardrails de AGENTS.md y .claude/settings.json. Nunca leas ni edites .env ni secretos.
- Solo datos sintéticos (Faker, dominio example.com).
- Ética: la IA no rechaza ni contrata; excluye atributos protegidos; explica cada score.
- Idioma de la documentación: español (México). Código y nombres técnicos en inglés.
- Si algo es ambiguo, pregunta antes de asumir.
```

---

## Prompt R · Revisión adversarial (reutilizable)

```text
Actúa como revisor adversarial independiente. NO has visto cómo se produjo este trabajo y tu objetivo es
encontrar problemas, no aprobar.

Revisa: {{ruta(s) o PR}}
Contra: {{spec / documento / criterios de aceptación}}

Evalúa:
1. Cumplimiento de la spec y de cada escenario GIVEN/WHEN/THEN.
2. Ambigüedades, requisitos faltantes o contradicciones con otros documentos de nexo-specs/docs.
3. Seguridad (OWASP Top 10 y OWASP LLM Top 10), privacidad (LFPDPPP, PII en logs/prompts) y sesgo.
4. Calidad de pruebas: ¿prueban comportamiento o implementación? ¿faltan casos borde?
5. Rendimiento: N+1, llamadas secuenciales evitables, índices faltantes, payloads grandes.
6. Over-engineering o código muerto.

Entrega `review.md` con una tabla: id | severidad (BLOCKER/MAJOR/MINOR) | hallazgo | evidencia
(archivo:línea) | recomendación. Termina con un veredicto: APROBADO / CAMBIOS REQUERIDOS.
No modifiques archivos.
```

---

# Prompts de documentación

> Todos los documentos se generan en `nexo-specs/docs/`. Genera uno por sesión, revísalo con el Prompt R y corrige antes de pasar al siguiente: cada documento es contexto para los siguientes.

### P1.1 · Visión del producto 🛡️
```text
[Prompt 0]
Genera docs/01-vision-producto.md en español con:
1. Problema por actor (candidato, reclutador, empresa con SAP, admin) en tabla.
2. Propuesta de valor (match explicable, cero ghosting 3/5 días, ingesta universal 1..N con
   sincronización bidireccional, auto-apply responsable, CV inteligente, omnicanal).
3. 4 personas con objetivo principal.
4. Roles RBAC: candidate, recruiter, employer_admin, platform_admin, integration.
5. Funcionalidades por portal (candidato, empleador, admin) incluyendo: radar de skills, stepper,
   dashboard de postulaciones, calendario Calendly + Google Calendar/ICS, importación CSV/PDF/API/
   endpoint/conectores/MCP, cierre de vacantes filled/cancelled/on_hold, posiciones disponibles y
   número de postulantes por vacante, pagos.
6. Máquinas de estado de vacante y postulación.
7. Modelo de negocio con cobro con tarjeta (Stripe): pay-per-post, packs, suscripciones Pro/Business/
   Enterprise, add-ons; precios sugeridos en MXN; reglas de consumo de créditos en importaciones masivas.
8. Benchmark: funcionalidades de bolsas de trabajo (LinkedIn, Indeed, OCC, Computrabajo) y ATS
   (Greenhouse, Lever, Workable, Ashby) y cómo NexoTalent las iguala o mejora, con fase (MVP/1/2/3).
9. Métricas: North Star y de soporte, incluyendo precision@10 y ratio de impacto adverso.
Formato: tablas y listas, sin relleno.
```

### P1.2 · Arquitectura del sistema 🧭 🛡️
```text
[Prompt 0]
Lee docs/01-vision-producto.md. Genera docs/02-arquitectura.md con:
1. Estilo: microservicios por bounded context, EDA (EventBridge + SQS + DLQ + outbox), BFF por canal,
   hexagonal + capa anticorrupción para integraciones. Justifica cada uno.
2. Diagrama de contexto C4 nivel 1 y de contenedores nivel 2 en Mermaid (clientes web/admin/Android/
   iOS, CloudFront, BFFs, realtime WebSocket, Cognito, 10 microservicios, MCP server, EventBridge,
   SQS, Aurora+pgvector, Redis, S3, Bedrock, Textract, Scheduler).
3. Tabla de servicios: responsabilidad, eventos que publica y consume.
4. Sección "Optimización de llamadas del backend": endpoints agregados por pantalla, Promise.all,
   undici keep-alive, DataLoader, CQRS read models, Redis stale-while-revalidate con invalidación por
   evento, ETag/304, paginación keyset, selección de campos, Brotli/HTTP2, WebSocket/SSE en vez de
   polling, contadores desnormalizados, batch de embeddings y prompt caching, HNSW.
5. Estructura polyrepo y cómo se coordinan cambios entre repos.
6. ADRs resumidos (polyrepo, EventBridge, pgvector, Bedrock, Fastify, Fargate, outbox, Drizzle, BFF).
7. Beneficios, sacrificios y mitigación para el MVP (despliegue modular).
Verifica que los diagramas Mermaid sean sintácticamente válidos.
```

### P1.3 · Arquitectura de IA 🛡️
```text
[Prompt 0]
Lee docs/01 y 02. Genera docs/03-arquitectura-ai.md con:
1. AI Plane (diagrama Mermaid): LLM gateway (routing por modelo, structured outputs con JSON Schema +
   Zod, prompt caching, semantic cache, PII redaction, cuotas, prompts versionados), embeddings,
   matching, RAG, extractores, agentes, Langfuse.
2. Extracción de skills de CV (PDF/DOCX/escaneado con Textract) y de vacantes (PDF con N vacantes:
   segmentación + extracción con confianza), normalización contra taxonomía (ESCO/O*NET) por embeddings,
   human-in-the-loop.
3. Mejora de CV: modo importación y modo guiado (wizard 5 pasos), sin inventar experiencia.
4. Fórmula de matching híbrido con pesos, pre-filtro SQL + ANN + re-ranking, atributos protegidos
   excluidos, caché e invalidación.
5. Cálculo de datos para la gráfica de radar (6–8 ejes por categoría, required vs candidate 0-5,
   strengths, gaps).
6. RAG: casos (copiloto reclutador, asistente candidato, soporte admin), chunking, búsqueda híbrida
   BM25 + vector con RRF, rerank, citas obligatorias, aislamiento multi-tenant con RLS.
7. MCP: servidor propio (tools y resources con roles) y clientes MCP de proveedores de vacantes.
8. Agentes: auto-apply, screening, copiloto, import; herramientas y límites.
9. Guardrails de IA del producto y defensa contra prompt injection en documentos.
10. Tabla de evals con dataset, métrica y umbral de CI.
```

### P1.4 · Integraciones 🛡️
```text
[Prompt 0]
Lee docs/02 y 03. Genera docs/04-integraciones.md con:
1. Modelo canónico CanonicalJob (JSON) y regla de unicidad (organization_id, source_type, external_id).
2. Canales de ingesta 1..N con diagrama: API push (Idempotency-Key, 1..1000), endpoint registrado
   con pull programado y mapeo JSONPath, webhook entrante HMAC, CSV con URL prefirmada y validación por
   fila, PDF con Textract + LLM, formulario con asistente. Estados de la importación y cobro de créditos.
3. Conectores empresariales con puertos JobSourcePort/StatusSinkPort y adaptadores: SAP
   SuccessFactors (OData), Workday, Salesforce (CDC), HubSpot, Dynamics 365, Greenhouse/Lever,
   REST genérico, cliente MCP genérico. Sincronización bidireccional de estatus con tabla de mapeo,
   credenciales en Secrets Manager, resiliencia (retry, circuit breaker, DLQ), idempotencia.
4. Registro de servidores MCP de proveedores de vacantes y mapeo de tools.
5. Calendly: OAuth del reclutador, scheduling links de un solo uso, webhooks invitee.created/canceled,
   correlación con la postulación, diagrama de secuencia. Calendario del candidato: vista en la app,
   sincronización con Google Calendar (OAuth) y feed ICS. Cambios automáticos de estatus.
6. Stripe: Checkout, Payment Intents con 3DS, webhooks idempotentes, ledger de créditos, PCI SAQ A,
   facturación CFDI en fase 2.
```

### P1.5 · Eventos y notificaciones 🛡️
```text
[Prompt 0]
Genera docs/05-eventos-notificaciones.md con:
1. Envelope CloudEvents 1.0 con extensión nexo (tenantId, correlationId, causationId, actor); reglas
   (inmutables, versionados, sin PII, idempotencia, FIFO por subject donde importe).
2. Catálogo de eventos (productor y consumidores).
3. Detección de postulaciones estancadas a 3 y 5 días: barrido horario con EventBridge Scheduler,
   stale_level idempotente, reinicio al cambiar estatus, escalamiento al día 5, acciones rápidas
   (cambiar estatus, mensaje dentro de la postulación, email) también desde Slack/Teams. Diagrama.
4. Arquitectura de notificaciones omnicanal (rules engine, preferencias, quiet hours, dedupe, colas por
   canal): in-app WebSocket, SES, WhatsApp Cloud API, SNS (FCM/APNs), Slack, Teams. Diagrama.
5. Matriz canal × audiencia y tabla de notificación por cada paso del proceso para candidato y
   empleador.
6. Detalles: plantillas MJML e i18n, reglas de WhatsApp (opt-in, plantillas aprobadas), registro de
   tokens push, apps de Slack/Teams, bitácora de estados.
```

### P1.6 · Modelo de datos 🛡️
```text
[Prompt 0]
Lee docs/01–05. Genera docs/06-modelo-datos.md con:
1. Convenciones: Aurora PostgreSQL 16 + pgvector, esquema por servicio, FK solo dentro del esquema,
   ULID, timestamps, organization_id + RLS.
2. Diagrama erDiagram de Mermaid con TODAS las entidades (organization, user, membership, job,
   skill, job_skill, candidate, candidate_skill, resume, application, application_status_history,
   application_message, interview, auto_apply_rule, match_score, import_batch, import_item,
   integration_connection, plan, subscription, credit_ledger, payment, notification,
   notification_preference, device), con tipo, PK, FK, UK y comentario de restricciones en cada
   atributo, y cardinalidades.
3. Descripción detallada de las entidades principales (tabla atributo | tipo | restricciones |
   descripción), índices (B-tree parciales, GIN tsvector, HNSW) y reglas (UNIQUE job+candidate,
   positions_filled ≤ positions_total, ledger append-only).
4. Consulta ejemplo de matching con filtros + ANN y parámetros de pgvector (ef_search, iterative_scan).
Valida que el erDiagram renderice.
```

### P1.7 · API y contratos 🛡️
📁 `nexo-specs`
```text
[Prompt 0]
1. Genera docs/07-api.md: convenciones (versionado, JWT/API key, RFC 9457, cursor, Idempotency-Key,
   ETag, correlation id), catálogo completo de endpoints del BFF (candidato, empleador, admin,
   webhooks) y OpenAPI 3.1 de los 3 endpoints principales: POST /v1/jobs/imports,
   GET /v1/jobs/{jobId}/match, PATCH /v1/applications/{id}/status (con If-Match), con ejemplos de
   petición/respuesta y códigos de error.
2. Genera los archivos reales api/bff-web.openapi.yaml y api/<servicio>.openapi.yaml para jobs,
   applications, ai, ingestion, candidates, scheduling, billing, identity, notifications con todos los
   endpoints del catálogo.
3. Genera asyncapi/nexo-domain.yaml con todos los eventos de docs/05 y schemas/*.json.
4. Ejecuta las validaciones (spectral, asyncapi, ajv) y corrige hasta que pasen.
```

### P1.8 · Frontend y UX 🛡️
```text
[Prompt 0]
Usa la skill frontend-design si está disponible. Genera docs/08-frontend-ux.md con:
1. Stack: React 19, Vite, TS, TanStack Router/Query, Zustand, Tailwind v4, Radix, Recharts, Motion,
   RHF + Zod, i18next, Vitest, Storybook, Playwright.
2. Dirección visual moderna "AI-native": dark-first con modo claro, aurora gradient, glass solo en
   destacados, tipografía Geist, señales de IA consistentes (✦, borde gradiente animado, shimmer,
   streaming, chip "Generado por IA"), command palette ⌘K, micro-interacciones, WCAG 2.2 AA.
3. Tokens CSS (colores, radios, sombras, gradiente IA).
4. Catálogo de componentes nexo-ui: SkillRadarChart (vacante vs. candidato y comparación de hasta 3
   candidatos), MatchScoreRing, ApplicationStepper, JobCard (posiciones disponibles y postulantes),
   KanbanBoard con badges 3/5 días, AIStreamText, FileDropzone, ImportPreviewTable, CalendarView,
   KPIStatCard, FunnelChart, DataTable, NotificationCenter.
5. Pantallas por portal (candidato, empleador, admin) incluyendo dashboard de postulaciones,
   mejorar CV, auto-apply, importar vacantes, cerrar vacante, integraciones, facturación, copiloto.
6. Presupuesto de rendimiento (LCP, INP, CLS, JS inicial) y técnicas.
```

### P1.9 · Seguridad, privacidad y ética 🛡️
```text
[Prompt 0]
Genera docs/09-seguridad-privacidad-etica.md con:
1. Tabla de controles de seguridad: identidad (Cognito, MFA), RBAC/ABAC + RLS, API (validación,
   rate limit), webhooks firmados, archivos (presigned, magic bytes, antivirus, KMS), secretos, red
   (VPC privada, endpoints, WAF), dependencias y supply chain (SBOM, OIDC), logs sin PII, OWASP Top 10
   y OWASP Top 10 para LLM. Con ejemplos de código cortos.
2. Privacidad en México según la Ley Federal de Protección de Datos Personales en Posesión de los
   Particulares vigente: aviso de privacidad, finalidades, ARCO (exportar/borrar incluyendo embeddings),
   transferencias al postular y a conectores, no recabar datos sensibles.
3. Si se opera en la UE: GDPR (art. 22) y AI Act (reclutamiento como alto riesgo). Menciona la ley
   local 144 de NYC como referencia de auditoría de sesgo.
4. Principios éticos implementados: supervisión humana, explicabilidad, no discriminación (evals
   contrafactuales y regla 4/5), transparencia, consentimiento, minimización, agencia limitada,
   rendición de cuentas (ai_audit_log), no biometría.
Verifica referencias normativas con búsqueda web antes de afirmarlas y cita las fuentes al final.
```

### P1.10 · Estrategia de testing 🛡️
```text
[Prompt 0]
Genera docs/10-estrategia-testing.md con: pirámide (Mermaid) y porcentajes, ciclo TDD con un ejemplo
en Vitest del caso de uso ChangeApplicationStatus (transición inválida y outbox), matriz de pruebas
por servicio (unit, integración con Testcontainers/LocalStack/WireMock/stripe-mock, contrato Pact y
AsyncAPI), pruebas de frontend y design system (Vitest, Storybook interaction + a11y, Playwright
visual, MSW), 7 flujos E2E críticos, pruebas no funcionales (k6, resiliencia, ZAP) y quality gates
de CI (cobertura de dominio ≥ 80 %, mutation testing, evals).
```

### P1.11 · Infraestructura AWS 🛡️
```text
[Prompt 0]
Genera docs/11-infraestructura-aws.md con: diagrama Mermaid (Route 53, CloudFront+WAF, S3 web, ALB,
ECS Fargate, Lambda, Aurora Serverless v2 con pgvector, ElastiCache Valkey, VPC endpoints,
EventBridge+Scheduler, SQS+DLQ, Cognito, Bedrock, Textract, SES, SNS, Secrets Manager, KMS, API
Gateway WebSocket, CloudWatch/X-Ray), entornos (dev, preview por PR, staging, prod) y cuentas,
estructura de nexo-infra en CDK TypeScript con el construct NexoService, pipeline CI/CD (Mermaid)
con OIDC, migraciones expand/contract, canary blue/green con rollback por alarmas, observabilidad
(OTel, Langfuse, dashboards, alarmas), estimación de costos y DR (RPO/RTO).
```

### P1.12 · Harness, SDD y guardrails
```text
[Prompt 0]
Genera docs/12-harness-sdd-guardrails.md documentando cómo se construye el producto con agentes:
estructura de harness por repo, plantilla AGENTS.md, skills compartidas, MCP del agente; flujo SDD con
OpenSpec (Mermaid) y capacidades; documentación as code y subagente adversarial-reviewer con formato
de hallazgos; settings.json con permisos y hooks y tabla de qué bloquea cada hook y harness-log.jsonl;
trabajo polyrepo con agentes (repos.yaml, --add-dir, orquestación de changes cross-repo, versionado,
Pact); evals del harness (20 tareas, tipos, métricas, comparación v1/v2/v3); AI for Legacy con el
ATS legacy simulado (docs, tests de caracterización, ACL, strangler).
```

### P1.13 · Historias de usuario 🛡️
```text
[Prompt 0]
Genera docs/13-historias-usuario.md con: backlog priorizado de al menos 15 historias (épica, MoSCoW,
puntos Fibonacci) cubriendo radar, stepper, importación CSV/PDF, importar CV, constructor de CV,
auto-apply, pagos, recordatorios 3/5 días, Calendly, Google Calendar, cerrar vacante, preferencias de
notificación, conector SAP, admin y copiloto. Detalla al menos 5 historias en formato
"Como… quiero… para…" con criterios Gherkin en español (casos felices, de error y de accesibilidad),
notas técnicas, prioridad y puntos. Cumplen INVEST.
```

### P1.14 · Tickets de trabajo 🛡️
```text
[Prompt 0]
Genera docs/14-tickets-trabajo.md con 3 tickets completos listos para desarrollar de inicio a fin:
- TK-BE: endpoint de match con datos de radar (ai-svc + BFF), con caché, ETag e invalidación por eventos.
- TK-FE: SkillRadarChart y ApplicationStepper en nexo-ui e integración en nexo-web.
- TK-DB: esquema de matching con pgvector, HNSW, GIN, RLS y seeds sintéticos.
Cada ticket: tabla de metadatos (repo, historia, change OpenSpec, estimación, etiquetas), contexto,
alcance, especificación técnica, criterios de aceptación como checklist medible, pruebas por nivel,
definición de terminado y dependencias.
```

### P1.15 · Roadmap
```text
[Prompt 0]
Genera docs/15-roadmap.md con fases (0 fundaciones, 1 MVP web, 1.5 omnicanal, 2 móvil, 3 enterprise),
plan de 8 semanas para el proyecto final con evidencia esperada por semana para el curso y tabla de
riesgos con mitigación. Genera docs/README.md como índice de todos los documentos.
```

### P1.16 · Revisión adversarial de toda la documentación 🛡️
```text
[Prompt R] aplicado a nexo-specs/docs/*.md.
Adicionalmente verifica consistencia cruzada: nombres de estados, eventos, endpoints, entidades y
servicios deben coincidir entre todos los documentos y los contratos (api/, asyncapi/, schemas/).
Lista cada inconsistencia con ambos lugares donde aparece.
```

### P1.17 · README de entrega del curso
```text
[Prompt 0]
Lee la plantilla readme.md del curso y todos los documentos de nexo-specs/docs. Genera
readme-updated.md llenando las secciones 0 a 6 (OMITE la sección 7 de Pull Requests y quítala del
índice):
0. Ficha (deja marcadores para nombre, URLs y repositorio).
1. Objetivo, funcionalidades, diseño y UX (recorrido por pantallas con marcadores de capturas/video),
   instalación local paso a paso (requisitos, clonado polyrepo, docker compose, variables, migraciones,
   seeds, arranque de servicios y frontends, cuentas de prueba).
2. Arquitectura (diagrama Mermaid, patrón, justificación, beneficios y sacrificios), componentes,
   estructura de ficheros, infraestructura y despliegue, seguridad con ejemplos, tests.
3. Modelo de datos (erDiagram completo) y descripción de entidades.
4. Máximo 3 endpoints en OpenAPI con ejemplos.
5. 3 historias de usuario.
6. 3 tickets (backend, frontend, base de datos).
Enlaza a docs/ para el detalle. No inventes URLs reales.
```

---
