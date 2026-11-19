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

**Dependencias:** TK-DB-007, embeddings de vacantes y candidatos disponibles.

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
- Columnas `embedding vector(1024)` en `jobs.job`, `candidates.candidate`, `ai.skills` (taxonomía) y tabla `ai.rag_chunks`.
- Tabla `ai.match_score` (PK compuesta, `radar jsonb`, `factors jsonb`, `model_version`, `computed_at`).
- Índices:
  - `CREATE INDEX CONCURRENTLY job_embedding_hnsw ON jobs.job USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64) WHERE status = 'published';`
  - Igual para `candidates.candidate` (`WHERE open_to_work`).
  - B-tree `(status, country, modality)` para el pre-filtro.
  - GIN `to_tsvector('spanish', title || ' ' || description)` para búsqueda híbrida.
- RLS en `ai.rag_chunks` por `tenant_id`.
- Migraciones Drizzle *expand-only* (sin `DROP`), reversibles; *seed* de 2,000 vacantes y 5,000 candidatos sintéticos con embeddings precalculados.

**Criterios de aceptación**
- [ ] `EXPLAIN ANALYZE` de la consulta de matching usa el índice HNSW con filtros (`iterative_scan`).
- [ ] p95 < 50 ms para top-200 con 100k vacantes sintéticas.
- [ ] Recall@200 ≥ 0.95 vs. búsqueda exacta en el dataset de prueba.
- [ ] RLS impide leer chunks de otro tenant (prueba de integración).
- [ ] Migración aplica y revierte sin errores en Testcontainers.

**Pruebas:** integración con Testcontainers (`pgvector/pgvector:pg16`), prueba de rendimiento con script `bench/vector.ts`, prueba de RLS.

**DoD:** diagrama ER actualizado en [06-modelo-datos.md](06-modelo-datos.md), runbook de reindexado, revisión adversarial (riesgos de bloqueo de tablas).
