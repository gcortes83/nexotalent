# 14 · Tickets de trabajo

Formato por ticket: contexto, alcance, especificación técnica, criterios de aceptación, pruebas, definición de terminado (DoD), dependencias, estimación y etiquetas. Cada ticket referencia su *change* de OpenSpec.

---

## TK-BE-012 · [Backend] Endpoint de match con datos de radar

| Campo | Valor |
|---|---|
| Repo | `nexo-ai-svc` (+ exposición en `nexo-bff-web`) |
| Historia | HU-01 |
| Change OpenSpec | `add-job-match-radar` |
| Estimación | 5 pts |
| Etiquetas | `backend`, `ai`, `matching`, `performance` |

**Contexto.** El candidato necesita su score y los datos del radar para una vacante. El cálculo debe ser rápido y explicable.

**Alcance**
- `GET /internal/v1/match?candidateId&jobId` en `ai-svc` y `GET /v1/jobs/{jobId}/match` en el BFF (toma `candidateId` del JWT).
- Caso de uso `ComputeJobMatch` con la fórmula híbrida de [03-arquitectura-ai.md §3](03-arquitectura-ai.md).
- Agrupación por categorías → `radar[]` (6–8 ejes), `strengths[]`, `gaps[]`, `explanation` (plantilla determinista; LLM solo si `explain=rich`).
- Persistencia en `ai.match_score` + caché Redis `match:{candidateId}:{jobId}` (TTL 24 h).
- Invalidación al consumir `job.updated` y `candidate.profile_updated`.
- `ETag` = hash(`model_version`, `computed_at`).

**Especificación técnica**
- Fastify route con schema de respuesta `JobMatch` generado desde `nexo-specs`.
- Puertos: `SkillReadModel`, `EmbeddingRepo`, `MatchCache`, `Clock`.
- Solo skills `confirmed = true`; atributos protegidos nunca se leen.
- Métricas: `match_compute_duration_ms`, `match_cache_hit_ratio`.

**Criterios de aceptación**
- [ ] Respuesta conforme al schema `JobMatch` (validación en test de contrato).
- [ ] p95 < 80 ms con caché caliente y < 250 ms en frío (k6, 50 RPS).
- [ ] `304` si `If-None-Match` coincide.
- [ ] Candidato sin skills → `score: 0`, `radar[].candidate = 0`, sin error.
- [ ] Vacante no publicada → `404`.

**Pruebas**
- Unit: fórmula (casos: cobertura total, must-have faltante, pesos), agrupación del radar, explicación.
- Integración: Testcontainers Postgres+pgvector con fixtures; Redis real.
- Contrato: Pact provider contra consumidor `nexo-bff-web`.
- Eval: `nexo-evals/matching` precision@10 no disminuye.

**DoD:** TDD evidenciado (commit de test rojo), cobertura dominio ≥ 80 %, OpenAPI actualizado, revisión adversarial sin BLOCKER, trazas OTel visibles.

**Dependencias:** TK-DB-007 y TK-DATA-001 (genera los embeddings y skills de entrada).

---

## TK-FE-021 · [Frontend] `SkillRadarChart` y `ApplicationStepper` en el design system

| Campo | Valor |
|---|---|
| Repos | `nexo-ui` (componentes) → `nexo-web` (uso) |
| Historias | HU-01, HU-02 |
| Change OpenSpec | `add-radar-and-stepper-components` |
| Estimación | 8 pts |
| Etiquetas | `frontend`, `design-system`, `a11y` |

**Alcance**
1. `SkillRadarChart` (Recharts `RadarChart`):
   - Props: `data: {axis, required, candidate}[]`, `compare?: {name, data}[]` (hasta 3), `size`, `showLegend`, `ariaLabel`.
   - Vacante: línea discontinua `--nx-primary-2`; candidato: área `--nx-primary` 35 % de opacidad; animación de entrada 600 ms (desactivada con `prefers-reduced-motion`).
   - Tooltip por eje; tabla alternativa `sr-only`.
   - Carga *lazy* de Recharts.
2. `ApplicationStepper`:
   - Props: `steps: {key, label, date?, note?}[]`, `current`, `terminal?: 'rejected' | 'withdrawn' | 'hired'`, `orientation: 'horizontal' | 'vertical' | 'auto'`.
   - Estados visuales `done`, `current` (pulso con gradiente IA), `upcoming`, `terminal-negative`.
   - `aria-current="step"`, navegación por teclado a tooltips.
3. Integración en `nexo-web`: página de detalle de vacante y dashboard del candidato con TanStack Query + invalidación por WebSocket.

**Criterios de aceptación**
- [ ] Historias de Storybook: vacío, 6 ejes, 8 ejes, comparación 3 candidatos, dark/light, móvil.
- [ ] Interaction tests: tooltip al hover/foco; stepper cambia al actualizar `current`.
- [ ] 0 violaciones axe serias/críticas.
- [ ] Snapshots visuales aprobados (Playwright) en 4 combinaciones tema × viewport.
- [ ] Bundle de la ruta de detalle < 60 KB gzip adicionales.
- [ ] Publicado `nexo-ui@x.y.0` (semver minor) y consumido por `nexo-web`.

**Pruebas:** Vitest (transformación de datos), Storybook interaction + a11y, Playwright visual, E2E del flujo HU-01/HU-02 con MSW.

**DoD:** componentes documentados (MDX), tokens usados (sin colores *hardcoded*), CHANGELOG, revisión adversarial.

---

## TK-DB-007 · [Base de datos] Esquema de matching con pgvector e índices HNSW

| Campo | Valor |
|---|---|
| Repos | `nexo-ai-svc`, `nexo-jobs-svc`, `nexo-candidates-svc` |
| Historias | HU-01, HU-06 |
| Change OpenSpec | `add-vector-matching-schema` |
| Estimación | 5 pts |
| Etiquetas | `database`, `pgvector`, `migration` |

**Alcance**
- Habilitar extensión `vector` (≥ 0.8) en Aurora (parameter group + `CREATE EXTENSION`).
- Columnas `embedding vector(1024)` en `jobs.job` y `candidates.candidate`; taxonomía `matching.skill`. *(La tabla `rag_chunks` se aplaza a v2 con el copiloto RAG.)*
- Tabla `ai.match_score` (PK compuesta, `radar jsonb`, `factors jsonb`, `model_version`, `computed_at`).
- Índices:
  - `CREATE INDEX CONCURRENTLY job_embedding_hnsw ON jobs.job USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64) WHERE status = 'published';`
  - Igual para `candidates.candidate` (`WHERE open_to_work`).
  - B-tree `(status, country, modality)` para el pre-filtro.
  - GIN `to_tsvector('spanish', title || ' ' || description)` para búsqueda híbrida.
- Aislamiento por organización en las consultas del empleador (RLS por `organization_id` en v2).
- Migraciones Drizzle *expand-only* (sin `DROP`), reversibles; *seed* de 2,000 vacantes y 5,000 candidatos sintéticos con embeddings precalculados.

**Criterios de aceptación**
- [ ] `EXPLAIN ANALYZE` de la consulta de matching usa el índice HNSW con filtros (`iterative_scan`).
- [ ] p95 < 50 ms para top-200 con 100k vacantes sintéticas.
- [ ] Recall@200 ≥ 0.95 vs. búsqueda exacta en el dataset de prueba.
- [ ] Un reclutador no puede leer postulaciones de otra organización (prueba HTTP).
- [ ] Migración aplica y revierte sin errores en Testcontainers.

**Pruebas:** integración con Testcontainers (`pgvector/pgvector:pg16`), prueba de rendimiento con script `bench/vector.ts`, prueba de RLS.

**DoD:** diagrama ER actualizado en [06-modelo-datos.md](06-modelo-datos.md), runbook de reindexado, revisión adversarial (riesgos de bloqueo de tablas).

---

## TK-DATA-001 · [Datos] Datos de entrada del match: seed sintético + extracción de skills del CV

| Campo | Valor |
|---|---|
| Repo | `apps/api` |
| Historias | HU-01, HU-04 |
| Change OpenSpec | `add-core-mvp` |
| Estimación | 3 pts |
| Estado | ✅ Implementado |

**Contexto.** El feedback señaló que ningún ticket producía los datos de entrada del match. Este ticket los genera para poder probar el núcleo de punta a punta sin ingesta, pagos ni Bedrock.

**Alcance**
- `apps/api/src/seed/seed-data.ts`: taxonomía de 30 skills en 8 categorías, 2 organizaciones, 9 vacantes (8 publicadas y 1 borrador, con pago simulado), 3 candidatos (uno sin skills) y postulaciones con 1, 4 y 6 días sin cambio. Embeddings deterministas de 1024 dimensiones.
- `npm run db:seed` (PostgreSQL) y modo `STORAGE=memory` con el mismo seed.
- `POST /v1/candidates/me/resume`: extractor por taxonomía (`AI_PROVIDER=mock`) con nivel por contexto y evidencia; las skills quedan **sin confirmar**.
- `PUT /v1/candidates/me/skills`: confirmación, recálculo del embedding e invalidación de la caché del match.

**Criterios de aceptación**
- [x] Solo correos `example.com` (lo verifica el hook `pii-guard`).
- [x] La extracción reconoce alias (K8s → Kubernetes) sin confundir subcadenas (Java ≠ JavaScript).
- [x] Las instrucciones embebidas en el CV no cambian el resultado.
- [x] Una candidata nueva pasa de score 0 a score > 0.5 tras subir su CV y confirmar.

---

## TK-BE-015 · [Backend] Dashboard del candidato con stepper (HU-02)

| Campo | Valor |
|---|---|
| Repo | `apps/api` + `apps/web` |
| Historia | HU-02 |
| Change OpenSpec | `add-core-mvp` |
| Estimación | 3 pts |
| Estado | ✅ Implementado |

**Alcance:** `GET /v1/bff/candidate/dashboard` devuelve en una llamada las postulaciones (orden por último cambio) con `stepper{steps[], current, terminal, terminalLabel}` y hasta 3 vacantes recomendadas por match. `POST /v1/applications/{id}/withdraw` para retirarse. Contrato en `api/openapi.yaml`.

**Criterios de aceptación**
- [x] El stepper refleja cancelación de entrevista (regresa a `shortlisted`) y estados terminales.
- [x] Las vacantes ya postuladas no aparecen en recomendadas.
- [x] Retirarse decrementa `applicantsCount`; no se puede retirar una postulación ajena (404).

---

# Tickets del change `add-accounts-jobs-notifications` (17/11/2026)

> Agregados el 19/11/2026 (prompt C19) para documentar lo construido con los prompts C10–C18 de `prompts.md`. Todos usan el
> monolito modular (`apps/api`, `apps/web`) y el contrato `api/openapi.yaml` 0.2.0. Specs delta en
> `openspec/changes/add-accounts-jobs-notifications/specs/`.

| Ticket | Título | Historia | Pts | Estado |
|---|---|---|---|---|
| TK-QA-001 | Pruebas funcionales en vivo, E2E, Docker y Makefile | — | 5 | ✅ |
| TK-BE-020 | Registro y login con contraseña | HU-16 | 3 | ✅ |
| TK-BE-021 | Gestión, cierre e importación de vacantes | HU-17, HU-03, HU-11 | 8 | ✅ (integración PG ⏳) |
| TK-BE-022 | Notificaciones in-app y email | HU-18 | 5 | ✅ |
| TK-BE-023 | Catálogo con filtros facetados, urgentes y USD | HU-19 | 5 | ✅ |
| TK-FE-030 | Landing, registro, perfil y portal del empleador | HU-16, HU-17 | 8 | ✅ |
| TK-FE-031 | Lista de vacantes, detalle y postulación sin sesión | HU-19 | 5 | ✅ |
| TK-FE-032 | Soft skills y radares por tipo de skill | HU-20 | 5 | ✅ |
| TK-FE-033 | i18n ES/EN, diseño responsivo y chrome del sitio | HU-21 | 8 | ✅ |
| TK-DATA-002 | Seed de 100 vacantes con descripciones y candidatos con soft skills | HU-19, HU-20 | 3 | ✅ |
| TK-QA-002 | Cierre de calidad del change | — | 3 | ⏳ |

---

## TK-QA-001 · [Calidad] Pruebas funcionales en vivo, E2E, Docker y Makefile

| Campo | Valor |
|---|---|
| Repo | raíz del monorepo |
| Prompt | C10 |
| Estado | ✅ Implementado |

**Alcance:** `tests/functional` (`node:test`, UC-00…UC-16 contra la app levantada), `tests/e2e` (Playwright, trazas en fallos),
`apps/web/Dockerfile` (nginx sin privilegios), servicios `postgres`, `postgres-test`, `migrate`, `api`, `web` y `mailpit` en
`docker-compose.yml`, `Makefile` (`setup`, `build [backend|frontend]`, `db-up`, `start`, `stop`, `test-*`, `docker-*`, `help`) y
`README.md` con el inicio rápido. Job `functional` en el CI.

**Criterios de aceptación**
- [x] `make setup && make start` levanta API (:4000) y web (:5173); `make docker-up` sirve la web en :8080.
- [x] `make test-functional` y `make test-e2e` pasan contra la app local.

---

## TK-BE-020 · [Backend] Registro y login con contraseña

| Campo | Valor |
|---|---|
| Repo | `apps/api` (`modules/identity`, `shared/password.ts`) |
| Historia | HU-16 |
| Estado | ✅ Implementado |

**Alcance:** `POST /v1/auth/register/candidate`, `POST /v1/auth/register/employer` (crea organización + `employer_admin`),
`POST /v1/auth/login` con `kind`. scrypt (N=2^14) con comparación en tiempo constante; política 8–128 con letra y número.
Migración `0002` (`password_hash`).

**Criterios de aceptación**
- [x] `201` con JWT al registrarse; `409 email-taken` si el correo existe; `422` con contraseña débil.
- [x] `401` uniforme ante correo inexistente, contraseña incorrecta o tipo de cuenta equivocado.
- [x] `/login?demo=1` conserva el login de demo (`DEMO_AUTH=true`).

---

## TK-BE-021 · [Backend] Gestión, cierre e importación de vacantes

| Campo | Valor |
|---|---|
| Repo | `apps/api` (`modules/jobs`) |
| Historias | HU-17, HU-03, HU-11 |
| Estado | ✅ Implementado · ⏳ integración PostgreSQL |

**Alcance:** `/v1/employer/jobs` (listar, crear), `/{jobId}` (editar), `/{jobId}/publish`, `/{jobId}/close` (soft delete) e
`/imports` (CSV, JSON `CanonicalJob`, PDF; máximo 500 por archivo; reporte por fila; upsert por `externalId`). Aislamiento por
organización (`404`). Campos `urgent` y `softSkills`. Moneda única USD (`0003`) y urgentes (`0004`).

**Criterios de aceptación**
- [x] `409 job-not-closable` / `job-not-editable` / `job-not-publishable` según el estado; `422` al publicar sin skills.
- [x] Una fila con otra moneda falla sola (`422`) y las válidas se importan; el PDF queda en borrador.
- [x] Las postulaciones de vacantes cerradas no aparecen como estancadas.
- [ ] `make test-int` contra pgvector real (requiere Docker).

---

## TK-BE-022 · [Backend] Notificaciones in-app y email

| Campo | Valor |
|---|---|
| Repo | `apps/api` (`modules/notifications`) |
| Historia | HU-18 |
| Estado | ✅ Implementado |

**Alcance:** tabla `notifications.notification`, `GET /v1/notifications`, `POST /v1/notifications/{id}/read` y `/read-all`.
Puerto `EmailSender` (`EMAIL_PROVIDER=log|smtp`; Mailpit con `make mail-up`). Email en `shortlisted`, `offer`, `hired`,
`rejected` y cierre de vacante; los demás cambios solo in-app. La notificación lleva `jobTitle` para redactarse en ES/EN.

**Criterios de aceptación**
- [x] Al preseleccionar se crea la notificación `selected` y sale un email.
- [x] Una persona no puede leer ni marcar notificaciones ajenas.

---

## TK-BE-023 · [Backend] Catálogo con filtros facetados, urgentes y USD

| Campo | Valor |
|---|---|
| Repo | `apps/api` (`modules/jobs`) |
| Historia | HU-19 |
| Estado | ✅ Implementado |

**Alcance:** `GET /v1/jobs` con texto, `modality`, `seniority`, `country`, `minSalary` (USD), `skills`, `urgent`, orden y
paginación; respuesta con `total`, `page`, `pageSize` y `facets` (conteos por opción). Índice parcial de urgentes.

**Criterios de aceptación**
- [x] `?urgent=true` devuelve solo urgentes y su conteo en la faceta.
- [x] Solo se listan vacantes `published`.

---

## TK-FE-030 · [Frontend] Landing, registro, perfil y portal del empleador

| Campo | Valor |
|---|---|
| Repo | `apps/web` |
| Historias | HU-16, HU-17, HU-18 |
| Estado | ✅ Implementado |

**Alcance:** `LandingPage` (accesos a registro y vacantes, radar de ejemplo, leyenda animada, logo ×3), `LoginPage` con pestañas
candidato/empleador, `RegisterPages`, `ProfilePage` (datos, CV en archivo o texto, skills y soft skills, vacantes aplicadas con
marcas), `EmployerJobsPage`, `JobFormPage`, `ImportJobsPage` (plantillas descargables) y `NotificationWatcher` (polling 10 s + toasts).

**Criterios de aceptación**
- [x] Cerrar una vacante pide confirmación.
- [x] La candidata ve el toast y la marca «Seleccionado» / «Vacante cerrada» (E2E-14, E2E-15).

---

## TK-FE-031 · [Frontend] Lista de vacantes, detalle y postulación sin sesión

| Campo | Valor |
|---|---|
| Repo | `apps/web` (`pages/JobsPage.tsx`, `pages/JobDetailPage.tsx`) |
| Historia | HU-19 |
| Estado | ✅ Implementado |

**Alcance:** lista al 90 % del ancho con filtros facetados en panel de 320 px, chips, orden, paginación y estado en la URL;
buscador con ícono de lupa; marca 🔥 urgente; brillo difuminado de selección (1 s; colores combinados en urgentes); salario
`US$`; extracto de 2 líneas; toda la tarjeta abre el detalle; sin sesión, invitación a registrarse con `?next=` seguro.

**Criterios de aceptación**
- [x] Filtros sincronizados con la URL (E2E-06).
- [x] Sin sesión: lista → detalle → crear cuenta → volver y postular (E2E-22).
- [x] `?next=` solo acepta rutas internas.

---

## TK-FE-032 · [Frontend] Soft skills y radares por tipo de skill

| Campo | Valor |
|---|---|
| Repo | `apps/web` (`SkillComparisonRadars`, `RadarSvg`) + taxonomía en `apps/api` |
| Historia | HU-20 |
| Estado | ✅ Implementado |

**Alcance:** dos radares vacante vs. candidato en el detalle (técnicas y soft skills en verde `#34d399`), un eje por skill pedida
con el nivel confirmado; con menos de 3 ejes se completa con skills del perfil y se avisa. 480 px en el detalle, 510 px en la
landing; etiquetas largas en dos líneas; tabla accesible. Formulario de vacante y perfil con sección de soft skills.

**Criterios de aceptación**
- [x] Pruebas de `SkillComparisonRadars` (ejes, relleno y aviso).
- [x] Solo las soft skills confirmadas cuentan para el score; `MATCH_MODEL_VERSION` sin cambio.

---

## TK-FE-033 · [Frontend] i18n ES/EN, diseño responsivo y chrome del sitio

| Campo | Valor |
|---|---|
| Repo | `apps/web` (`i18n/`, `styles.css`, `AiBackground`, `SiteFooter`, `MobileAppsSection`, `LanguageSwitcher`) |
| Historia | HU-21 |
| Estado | ✅ Implementado |

**Alcance:** diccionarios tipados ES/EN, selector fijo a la derecha del footer, `nexo.lang` y `?lang=`, `<html lang>`, fechas y
moneda por idioma; cortes 480/720/1024 px, menú plegable, `table--stack`; fondo animado de IA único con `prefers-reduced-motion`;
footer con placeholders (`site.ts`) y textos legales en 2 líneas; sección de apps móviles ocultable (`nexo.hideApps`).

**Criterios de aceptación**
- [x] E2E-20…E2E-24 (idioma, selector fijo, 2 líneas del footer).
- [x] `tests/e2e/responsive.spec.ts`: sin scroll horizontal en 360, 768 y 1280 px.
- [x] JS inicial < 180 KB gzip (sin librería de i18n).

---

## TK-DATA-002 · [Datos] Seed de 100 vacantes y candidatos con soft skills

| Campo | Valor |
|---|---|
| Repo | `apps/api/src/seed/` |
| Historias | HU-19, HU-20 |
| Estado | ✅ Implementado |

**Alcance:** 100 vacantes publicadas (18 urgentes) en varias empresas sintéticas con reclutadores `@example.com`, salarios en USD,
descripciones deterministas por secciones (`job-descriptions.ts`), soft skills en 2 de cada 3 vacantes generadas; candidatos Ana
(17 skills), Luis (15), Sofía (sin skills) y Valeria, Diego, Mariana y Jorge con postulaciones recientes. Contraseña `Demo1234`.

---

## TK-QA-002 · [Calidad] Cierre de calidad del change

| Campo | Valor |
|---|---|
| Prompt | C9 |
| Estado | ⏳ Pendiente |

- [ ] Revisión del subagente `adversarial-reviewer` sin BLOCKER (`docs/reviews/`).
- [ ] `npm run lint:api` y `make test-int` con Docker; salidas en `docs/evidence/`.
- [ ] Evidencia TDD rojo → verde de C11–C17 en `docs/evidence/`.
- [ ] Hooks: falsos positivos de `block-dangerous` (heredocs), `pii-guard` (xref de PDFs) y `protect-files` (scratchpad).
- [ ] Etiqueta `@smoke` en los E2E críticos.
- [ ] Archivar el change: fusionar las specs delta en `openspec/specs/`.
