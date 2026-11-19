# NexoTalent AI · contexto de proyecto (OpenSpec)

- **Producto:** plataforma de reclutamiento con match explicable entre candidatos y vacantes (radar de skills, score, stepper, cero ghosting).
- **Alcance actual:** núcleo MVP web (change `add-core-mvp`, implementado) + cuentas, gestión e importación de vacantes, notificaciones in-app/email, catálogo con filtros, soft skills, i18n ES/EN y diseño responsivo (change `add-accounts-jobs-notifications`, implementado; specs delta pendientes de archivar). La visión completa está en `docs/01`–`docs/15`.
- **Stack:** Node 24, TypeScript estricto, Fastify 5, Zod, PostgreSQL 16 + pgvector, React 19 + Vite + TanStack Query, Vitest + Testing Library.
- **Arquitectura:** monolito modular hexagonal (ADR-0001). Módulos: identity, jobs, candidates, matching, applications, notifications.
- **Convenciones:** español (México) en documentación, inglés en código; ULID con prefijo (`app_…`); errores RFC 9457; `If-Match` para escrituras concurrentes; datos solo sintéticos.
- **Ética:** solo skills confirmadas cuentan; atributos protegidos excluidos; la IA no rechaza ni contrata.
- **Capacidades:** `matching`, `applications-pipeline`, `candidate-profile` (en `specs/`); `accounts`, `job-management`, `notifications`, `job-catalog`, `web-experience` (delta en `changes/add-accounts-jobs-notifications/specs/`).
- **Pendiente:** apps móviles iOS y Android (change `add-mobile-support`, estado PENDIENTE).
