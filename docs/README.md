# NexoTalent AI · Documentación técnica

Plataforma de reclutamiento AI-native (polyrepo · Node.js · React · AWS). Estos documentos viven en el repo `nexo-specs/docs/` y son la fuente de verdad para humanos y agentes.

| # | Documento | Contenido |
|---|---|---|
| 01 | [Visión del producto](01-vision-producto.md) | Problema, personas, roles, funcionalidades, estados, modelo de negocio, benchmark de competidores |
| 02 | [Arquitectura](02-arquitectura.md) | Microservicios, EDA, BFF, C4, optimización de llamadas, polyrepo, ADRs |
| 03 | [Arquitectura de IA](03-arquitectura-ai.md) | LLM gateway, extracción, matching, radar, RAG, MCP, agentes, evals |
| 04 | [Integraciones](04-integraciones.md) | Ingesta 1..N (API, endpoint, CSV, PDF), SAP/CRM/ATS, MCP, Calendly, Stripe |
| 05 | [Eventos y notificaciones](05-eventos-notificaciones.md) | Catálogo de eventos, recordatorios 3/5 días, omnicanal |
| 06 | [Modelo de datos](06-modelo-datos.md) | ER en Mermaid, entidades, índices |
| 07 | [API](07-api.md) | Catálogo y OpenAPI de endpoints principales |
| 08 | [Frontend y UX](08-frontend-ux.md) | Design system, look & feel AI, pantallas, rendimiento |
| 09 | [Seguridad, privacidad y ética](09-seguridad-privacidad-etica.md) | Controles, LFPDPPP, AI Act, sesgo |
| 10 | [Testing](10-estrategia-testing.md) | Pirámide, TDD, E2E, quality gates |
| 11 | [Infraestructura AWS](11-infraestructura-aws.md) | Diagrama, CDK, CI/CD, observabilidad |
| 12 | [Harness, SDD y guardrails](12-harness-sdd-guardrails.md) | AGENTS.md, OpenSpec, revisión adversarial, hooks, evals del harness, legacy |
| 13 | [Historias de usuario](13-historias-usuario.md) | Backlog y criterios Gherkin |
| 14 | [Tickets de trabajo](14-tickets-trabajo.md) | Backend, frontend y base de datos |
| 15 | [Roadmap](15-roadmap.md) | Fases, plan de 8 semanas, riesgos |

Estado real del MVP web (monolito modular en `apps/`): ver §1.1–1.2 de [07](07-api.md), §6 de [08](08-frontend-ux.md), §8 de [10](10-estrategia-testing.md), los tickets del change `add-accounts-jobs-notifications` en [14](14-tickets-trabajo.md) y [`../CHANGELOG.md`](../CHANGELOG.md).

Los prompts para generar y construir todo esto están en [`../prompts.md`](../prompts.md) (FASE C: C0–C19 ejecutados en la CLI); los de las apps móviles en [`../android-prompts.md`](../android-prompts.md) y [`../ios-prompts.md`](../ios-prompts.md).
