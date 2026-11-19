# Diseño · add-core-mvp

- **ADR-0001:** monolito modular en lugar de microservicios para el MVP.
- **Puertos** (`apps/api/src/ports.ts`): repos de users, skills, jobs, candidates, applications; `MatchCache`; `SkillExtractor`; `Embedder`; `Clock`.
- **Adaptadores:** `infra/memory` (tests y demo sin BD), `infra/db` (postgres.js + SQL y pgvector), `infra/ai/mock-ai` (extractor por taxonomía y embeddings deterministas de 1024 dimensiones). Bedrock es v2 y usa el mismo puerto.
- **Caché del match:** tabla `matching.match_score` por `(candidate, job)` con `model_version`. ETag = hash(`model_version`, `computed_at`).
- **Concurrencia:** `applications.application.version` + `If-Match`.
