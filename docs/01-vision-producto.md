# 01 · Visión del producto — NexoTalent AI

> Plataforma de reclutamiento **AI-native** que conecta vacantes y candidatos por **similitud semántica de skills**, automatiza el seguimiento del proceso y se integra con los sistemas que las empresas ya usan (SAP, CRMs, ATS y bolsas de trabajo vía MCP).

---

## 1. Problema

| Actor | Dolor actual |
|---|---|
| Candidato | Postula a decenas de vacantes sin saber por qué no avanza; no recibe respuesta ("ghosting"); su CV no refleja bien sus skills; agendar entrevistas es un ida y vuelta de correos. |
| Reclutador / empleador | Recibe cientos de CVs irrelevantes; filtra por palabras clave y pierde talento; publica la misma vacante en varios portales a mano; las postulaciones se quedan "olvidadas" días sin cambiar de estatus. |
| Administrador de plataforma | No tiene visibilidad del funnel, del uso de IA ni del cumplimiento normativo (datos personales, sesgo). |

## 2. Propuesta de valor

1. **Match explicable:** cada candidato ve, en una gráfica de radar, sus skills contra las que pide la vacante, con el porcentaje de afinidad y qué le falta.
2. **Cero ghosting:** recordatorios automáticos al empleador cuando una postulación lleva **3 días** (recordatorio) o **5 días** (escalamiento) sin cambio de estatus.
3. **Ingesta universal de vacantes:** 1 o N vacantes por API, endpoint registrado, CSV, PDF, conectores ERP/CRM/ATS y servidores MCP de bolsas de trabajo, con **sincronización bidireccional de estatus**.
4. **Auto-apply responsable:** el candidato define reglas (umbral de match, ubicación, salario, modalidad) y un agente postula por él, con límite diario y bitácora transparente.
5. **CV inteligente:** importa tu CV (PDF/DOCX/LinkedIn export) o captúralo con un asistente guiado; la IA extrae y normaliza skills y propone mejoras de redacción.
6. **Comunicación omnicanal:** in-app, email, WhatsApp, push (Android/iOS), Slack y Microsoft Teams, con preferencias por usuario.

## 3. Personas

| Persona | Descripción | Objetivo principal |
|---|---|---|
| **Ana, candidata** (Dev Sr., 29) | Busca remoto, usa el móvil para todo. | Saber dónde va cada postulación y aplicar solo donde tiene posibilidades. |
| **Luis, reclutador** (agencia, 35) | Maneja 20 vacantes simultáneas para 5 clientes. | Ver los mejores candidatos primero y no dejar postulaciones abandonadas. |
| **Marta, Head of Talent** (empresa con SAP) | Su fuente de verdad es SAP SuccessFactors. | Publicar desde SAP y que los estatus regresen a SAP sin captura manual. |
| **Admin NexoTalent** | Operación de la plataforma. | Gestionar usuarios, empresas, vacantes, candidatos, pagos y auditoría de IA. |

## 4. Roles y permisos (RBAC)

| Rol | Alcance |
|---|---|
| `candidate` | Su perfil, CV, postulaciones, reglas de auto-apply, calendario, notificaciones. |
| `recruiter` | Vacantes y postulaciones de su organización asignadas. |
| `employer_admin` | Todo lo de su organización: usuarios, facturación, integraciones, todas las vacantes. |
| `platform_admin` | Administración global: usuarios, organizaciones, vacantes, candidatos, moderación, auditoría. |
| `integration` (machine) | API keys / OAuth client credentials para ingesta y sincronización. |

## 5. Funcionalidades principales (MVP + fase 1)

### 5.1 Candidato
- Registro/login (email, Google, Apple, LinkedIn).
- **Importar CV** (PDF/DOCX) → extracción de experiencia, educación y skills con nivel estimado.
- **Constructor de CV guiado** (wizard de 5 pasos) con sugerencias de IA y exportación a PDF con plantilla ATS-friendly.
- Búsqueda semántica de vacantes ("backend con Node en fintech remoto").
- Detalle de vacante con **gráfica de radar** (vacante vs. candidato), score de match y *skill gaps*.
- Postulación en 1 clic y **auto-apply** por reglas.
- **Dashboard de postulaciones** con **stepper** de estatus por vacante.
- **Calendario de entrevistas** (agendadas vía Calendly) con sincronización a Google Calendar / feed ICS.
- Centro de notificaciones y preferencias por canal.

### 5.2 Empleador / reclutador
- Onboarding de organización, invitación de usuarios del equipo.
- **Publicación de vacantes con pago** (paquetes y suscripciones, ver §7).
- Importación de vacantes 1..N: formulario, API, endpoint registrado, CSV, PDF, conectores.
- **Dashboard de vacantes:** posiciones disponibles vs. cubiertas, número de postulantes, funnel por etapa, postulaciones estancadas.
- Vista de candidatos por vacante ordenados por match, con radar y resumen generado por IA (no decisorio).
- Cambio de estatus (drag & drop tipo kanban), mensajes al candidato dentro de la postulación.
- **Agendar entrevistas con Calendly** (link de agenda de un solo uso enviado al candidato).
- **Cerrar vacantes:** `filled` (ocupada), `cancelled` (cancelada), `on_hold` (en pausa), con motivo.
- Recordatorios a 3 y 5 días por email, Slack, Teams y push.

### 5.3 Administración de plataforma
- CRUD y moderación de **usuarios, organizaciones, vacantes y candidatos**.
- Gestión de planes, cupones y reembolsos.
- Monitoreo de integraciones y colas (DLQ), auditoría de decisiones de IA y reportes de sesgo.

## 6. Estados de negocio

**Vacante:** `draft → pending_payment → published → (on_hold ⇄ published) → filled | cancelled | expired`

**Postulación (stepper del candidato):**

```
Postulado → En revisión → Preseleccionado → Entrevista agendada → Entrevista realizada → Oferta → Contratado
                                         ↘ No seleccionado      ↘ Retirado por candidato
```

## 7. Modelo de negocio (sugerido)

Cobro con tarjeta vía **Stripe** (tarjetas de crédito/débito, Apple Pay, Google Pay; OXXO opcional para México). Precios en MXN, IVA incluido como sugerencia inicial a validar con el mercado:

| Plan | Precio sugerido | Incluye |
|---|---|---|
| **Pay-per-post** | $599 MXN / vacante (30 días) | 1 vacante, matching IA, 10 resúmenes IA. |
| **Pack 5** | $2,499 MXN | 5 créditos de vacante (vigencia 6 meses). |
| **Pro** (suscripción) | $4,999 MXN / mes | Hasta 15 vacantes activas, Calendly, Slack/Teams, importación CSV/PDF, copiloto RAG. |
| **Business** | $12,999 MXN / mes | Hasta 50 vacantes, API de ingesta, 1 conector (SAP/CRM/ATS), SSO. |
| **Enterprise** | A la medida | Conectores ilimitados, SLA, data residency, auditoría de sesgo dedicada. |

**Add-ons:** vacante destacada ($299 MXN), *boost* en canales externos vía MCP, créditos de screening IA, verificación de identidad/antecedentes.

**Reglas de cobro:** una vacante pasa a `published` solo con crédito disponible o pago confirmado (webhook `payment_intent.succeeded`). Las vacantes importadas en lote consumen un crédito cada una; el importador muestra el costo antes de confirmar. Pasar a `on_hold` congela los días restantes.

## 8. Benchmark y funcionalidades diferenciadoras

Funcionalidades comunes en bolsas de trabajo (LinkedIn, Indeed, OCC, Computrabajo) y ATS (Greenhouse, Lever, Workable, Ashby) que NexoTalent incorpora o mejora:

| Funcionalidad | Estado en NexoTalent | Diferenciador |
|---|---|---|
| Postulación en 1 clic | MVP | Más **auto-apply** con reglas y bitácora. |
| Alertas de vacantes | MVP | Alertas por **similitud semántica**, no por palabras clave. |
| Preguntas filtro (knockout) | Fase 1 | Generadas por IA desde la descripción, editables. |
| Scorecards de entrevista | Fase 1 | Plantillas por skill vinculadas al radar. |
| Kanban de pipeline | MVP | Con alertas de estancamiento 3/5 días. |
| Multiposting | Fase 1 | Vía **MCP** de bolsas de trabajo y conectores. |
| Career page de la empresa | Fase 2 | Generada automáticamente con el design system. |
| Talent pool / CRM de candidatos | Fase 2 | Re-match automático cuando abre una vacante nueva. |
| Insights salariales | Fase 2 | Rango sugerido por IA con datos agregados y anónimos. |
| Evaluaciones de skills | Fase 2 | Retos cortos generados por IA, calificados con rúbrica. |
| Entrevista asíncrona (video) | Fase 3 | Transcripción y resumen; **sin** scoring automático de rostro/voz (ética). |
| Programa de referidos | Fase 2 | Link de referido con trazabilidad y recompensa. |
| Gestión de ofertas y firma electrónica | Fase 3 | Plantillas de carta oferta y firma. |
| Analítica DEI y de funnel | Fase 2 | Reporte de sesgo del modelo (impacto adverso, regla 4/5). |
| NPS / feedback al candidato | Fase 1 | Retroalimentación generada por IA en rechazos (opcional, revisada). |
| Copiloto del reclutador (chat) | Fase 1 | **RAG** sobre candidatos y vacantes con citas. |
| Coach de carrera para candidato | Fase 2 | Plan de cierre de *skill gaps* con cursos sugeridos. |
| Perfil verificado | Fase 2 | Badges de identidad y certificaciones verificadas. |

## 9. Métricas de éxito (North Star y soporte)

- **North Star:** contrataciones por cada 100 vacantes publicadas.
- Tiempo medio a primer contacto (< 48 h).
- % de postulaciones estancadas > 5 días (< 5 %).
- Precision@10 del matching (≥ 0.7 en dataset etiquetado).
- Conversión de pago de vacantes, MRR, churn de empleadores.
- Ratio de impacto adverso por grupo protegido (≥ 0.8).
