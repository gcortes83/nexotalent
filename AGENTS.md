# NexoTalent AI · instrucciones para agentes de código

## Contexto
Monorepo del **núcleo MVP** de NexoTalent AI, una plataforma de reclutamiento con match explicable.
Está organizado como **monolito modular** (decisión tomada tras el feedback de la primera entrega; ver
`docs/adr/0001-monolito-modular-mvp.md`). Los límites de dominio se mantienen como módulos y como esquemas de
PostgreSQL. Los microservicios y el bus de eventos de `docs/02-arquitectura.md` son la **visión v2**.

Núcleo de punta a punta: subir CV → confirmar skills → radar y score → postular → stepper → el reclutador cambia el estatus.
Change `add-accounts-jobs-notifications`: registro y login con contraseña, perfil del candidato, gestión e importación
(CSV/JSON/PDF) de vacantes, cierre (soft delete) y notificaciones in-app + email, landing page.

| Ruta | Qué es |
|---|---|
| `apps/api` | API Node 24 + TypeScript + Fastify 5 + Zod. Hexagonal: `src/modules/<ctx>/{domain,application}`, `src/infra/{http,db,memory,ai}`, `src/ports.ts` |
| `apps/web` | React 19 + Vite + TanStack Query + React Router + Recharts |
| `apps/api/migrations` | SQL expand-only (PostgreSQL 16 + pgvector) |
| `openspec/` | `project.md`, specs por capacidad y changes |
| `docs/` | Documentación (fuente de verdad), ADRs, evidencias y revisiones |
| `.claude/` | Harness: hooks, subagentes, comandos |

## Comandos (`make help` lista todos)
- `make setup` (primera vez) · `make start` (API :4000 + web :5173) · `make start-memory` (sin BD)
- `make test`: unit + HTTP (API), componentes y páginas (web) y hooks · `make typecheck` · `make coverage`
- `make build [backend|frontend]` · `make db-up` (dev :5432 + test :5433) · `make db-migrate` · `make db-seed`
- `make test-int` (pgvector real) · `make test-functional` y `make test-e2e` (requieren la app levantada)
- `make docker-up` (stack completo, web :8080) · `make docker-test` · `make docker-down`
- La API lee `apps/api/.env` (creado por `make env` desde `apps/api/env.example`); no lo leas ni lo edites.

## Reglas
1. **Un ticket o tarea a la vez.** Solo implementa lo que está en el change activo de `openspec/changes/`. Si falta algo o es ambiguo, detente y pregunta.
2. **TDD**: primero la prueba que falla (subagente `test-writer`), muestra el rojo y guarda la evidencia en `docs/evidence/`.
3. **Hexagonal**: `domain/` es puro (sin I/O ni imports de `infra/`). Los casos de uso dependen de puertos (`src/ports.ts`).
4. **Contrato**: cualquier cambio de API actualiza `api/openapi.yaml` y `apps/web/src/api/types.ts` en el mismo PR.
5. **Ética del match**: solo cuentan las skills `confirmed`; los atributos protegidos nunca entran al modelo; la IA no rechaza ni contrata (solo humanos pasan a `rejected` o `hired`). Si cambias pesos o reglas, sube `MATCH_MODEL_VERSION`.
6. **Datos**: solo sintéticos (`example.com`). Nunca leas ni edites `.env*`. Las migraciones aplicadas son inmutables.
7. **Fuera de alcance del MVP** (no lo implementes sin un change aprobado): Stripe, Calendly, ingesta por API pull programada, WhatsApp/push/Slack, auto-apply, RAG/copiloto, MCP, conectores, apps móviles (pendientes). El email solo sale por el puerto `EmailSender` (log o Mailpit).
8. Documentación en español (México); código e identificadores en inglés.

## Definición de terminado
`npm test` y `npm run typecheck` en verde · cobertura de dominio y aplicación ≥ 80 % · spec y `tasks.md` actualizados ·
revisión del subagente `adversarial-reviewer` sin BLOCKER · entrada en `CHANGELOG.md`.
