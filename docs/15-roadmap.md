# 15 · Roadmap y plan de entrega

## 1. Fases

| Fase | Alcance | Entregable |
|---|---|---|
| **0 · Fundaciones** | Workspace polyrepo, harness, OpenSpec, contratos base, infra dev, CI | Repos creados, `docker compose up` funcional |
| **1 · MVP web** (proyecto final) | Identity, jobs (crear/cerrar/pago), ingesta API+CSV+PDF, CV import + skills, matching + radar, postulación + stepper, dashboards candidato/empleador, admin básico, notificaciones in-app + email, recordatorios 3/5 días, Calendly | Demo en `staging` AWS |
| **1.5 · Omnicanal** | WhatsApp, push web, Slack, Teams, Google Calendar, auto-apply, constructor de CV, copiloto RAG, MCP server | Release `v1.1` |
| **2 · Móvil** · ⏸️ **PENDIENTE** | Apps nativas Android e iOS (ver `android-prompts.md`, `ios-prompts.md`), push FCM/APNs. Implementación y pruebas no iniciadas (change `add-mobile-support`). | Builds en TestFlight / Play Internal |
| **3 · Enterprise** | Conectores SAP, Workday, Salesforce, HubSpot, ATS; MCP de proveedores; SSO; analítica DEI; career pages | Release `v2.0` |

> **Actualización 17/11/2026 (feedback de la 1.ª entrega):** la fase 1 se reduce al **núcleo MVP web** (change `add-core-mvp`,
> ya implementado y probado): CV → skills confirmadas → radar y score → postular → stepper → cambio de estatus, más estancadas 3/5
> en el dashboard. Stripe, Calendly, la ingesta programada y el admin pasan a 1.5/v2 y se simulan en el MVP. Ver `prompts.md` § Estado de ejecución.
>
> **Actualización 19/11/2026:** el change `add-accounts-jobs-notifications` (prompts C10–C18) recupera parte de la fase 1:
> registro y login, gestión, cierre e importación CSV/JSON/PDF de vacantes, notificaciones in-app + email (Mailpit), catálogo con
> filtros y urgentes, soft skills, i18n ES/EN y diseño responsivo. Siguen pendientes: despliegue en AWS (`deployment.md`),
> Stripe, Calendly, recordatorios 3/5 por email, admin y las apps móviles.

## 2. Plan sugerido para el proyecto final (8 semanas)

| Semana | Objetivo | Evidencia para el curso |
|---|---|---|
| 1 | Docs (este set), harness v1, OpenSpec con 6 capacidades | `docs/`, `AGENTS.md`, `openspec/` |
| 2 | Infra dev (CDK), identity, jobs con TDD | Pruebas rojas→verdes, reporte de cobertura |
| 3 | Ingesta CSV/PDF, billing Stripe test | Changes archivados, revisión adversarial |
| 4 | Candidates + extracción CV + pgvector | Evals extracción, `EXPLAIN` |
| 5 | Matching + radar + applications + stepper | Storybook, Pact |
| 6 | Notificaciones, stale sweep, Calendly, admin | E2E Playwright |
| 7 | Evals del harness v1/v2/v3, guardrails log, ética | `harness-vX.md`, reporte de sesgo |
| 8 | Despliegue staging, carga k6, video demo, README | `../README.md`, URL pública |

## 3. Riesgos
| Riesgo | Mitigación |
|---|---|
| Alcance excesivo de microservicios | Despliegue modular (varios servicios por tarea ECS) en MVP. |
| Costo AWS | Serverless v2 mínimo, apagar staging fuera de horario, Budgets. |
| Aprobación de plantillas WhatsApp / apps de Slack-Teams | Iniciar trámites en semana 1; *sandbox* para demo. |
| Calidad de extracción de PDFs | Confianza + `needs_review` + dataset de evals. |
| Sesgo del matching | Evals contrafactuales en CI, revisión humana obligatoria. |
