# 15 · Roadmap y plan de entrega

## 1. Fases

| Fase | Alcance | Entregable |
|---|---|---|
| **0 · Fundaciones** | Workspace polyrepo, harness, OpenSpec, contratos base, infra dev, CI | Repos creados, `docker compose up` funcional |
| **1 · MVP web** (proyecto final) | Identity, jobs (crear/cerrar/pago), ingesta API+CSV+PDF, CV import + skills, matching + radar, postulación + stepper, dashboards candidato/empleador, admin básico, notificaciones in-app + email, recordatorios 3/5 días, Calendly | Demo en `staging` AWS |
| **1.5 · Omnicanal** | WhatsApp, push web, Slack, Teams, Google Calendar, auto-apply, constructor de CV, copiloto RAG, MCP server | Release `v1.1` |
| **2 · Móvil** | Apps nativas Android e iOS (ver `android-prompts.md`, `ios-prompts.md`), push FCM/APNs | Builds en TestFlight / Play Internal |
| **3 · Enterprise** | Conectores SAP, Workday, Salesforce, HubSpot, ATS; MCP de proveedores; SSO; analítica DEI; career pages | Release `v2.0` |

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
| 8 | Despliegue staging, carga k6, video demo, README | `../readme.md`, URL pública |

## 3. Riesgos
| Riesgo | Mitigación |
|---|---|
| Alcance excesivo de microservicios | Despliegue modular (varios servicios por tarea ECS) en MVP. |
| Costo AWS | Serverless v2 mínimo, apagar staging fuera de horario, Budgets. |
| Aprobación de plantillas WhatsApp / apps de Slack-Teams | Iniciar trámites en semana 1; *sandbox* para demo. |
| Calidad de extracción de PDFs | Confianza + `needs_review` + dataset de evals. |
| Sesgo del matching | Evals contrafactuales en CI, revisión humana obligatoria. |
