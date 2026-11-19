# ADR-0001 · Monolito modular para el núcleo MVP

- **Estado:** aceptado (17 de noviembre de 2026)
- **Contexto:** el feedback de la primera entrega señala que el "MVP" planteado (unos diez microservicios en polyrepo, EventBridge, Stripe, Calendly, ingesta, notificaciones, CDK y canary) no cabe en ocho semanas.
- **Decisión:** un solo repositorio (`gcortes83/nexotalent`) con `apps/api` (monolito modular hexagonal) y `apps/web`. Los bounded contexts se mantienen como módulos y como esquemas de PostgreSQL. Las llamadas entre módulos son en proceso, sin bus de eventos.
- **Consecuencias:** + entrega de punta a punta más rápida y un solo despliegue. − la escalabilidad independiente y el aislamiento de fallos quedan para v2. Mitigación: puertos explícitos (`src/ports.ts`) y esquemas por módulo permiten extraer servicios después (patrón strangler).
- **Alternativas descartadas:** el polyrepo de microservicios de `docs/02-arquitectura.md` (queda como visión v2).
- **Repositorio:** este repo pasa de ser solo documentación a ser el repo de código. `repos.yaml` y `nexo-workspace` no existen en el MVP.
