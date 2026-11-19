# Tareas · add-core-mvp

## 1. Harness e implementación (fase Implementación)
- [x] 1.1 AGENTS.md / CLAUDE.md con stack, comandos y la regla de un ticket a la vez
- [x] 1.2 `.claude/settings.json` con permisos y hooks (block-dangerous, protect-files, pii-guard) y sus pruebas
- [x] 1.3 Subagentes adversarial-reviewer, test-writer y spec-checker; comandos /tdd y /review-pr

## 2. Backend [apps/api]
- [x] 2.1 Tests de la fórmula de match ANTES del código (rojo: docs/evidence/tdd-match-red.log) → verde
- [x] 2.2 Tests de la máquina de estados ANTES del código (rojo: docs/evidence/tdd-status-red.log) → verde
- [x] 2.3 TK-DATA-001: seed sintético (taxonomía, 2 organizaciones, 9 vacantes, 3 candidatos, postulaciones estancadas)
- [x] 2.4 Extracción de skills del CV (mock por taxonomía) + confirmación
- [x] 2.5 TK-BE-012: GET /v1/jobs/{jobId}/match con caché, ETag y 304
- [x] 2.6 Postular, retirar y cambiar estatus (If-Match, 409/412/428, aislamiento por organización)
- [x] 2.7 TK-BE-015: GET /v1/bff/candidate/dashboard (stepper y recomendadas) y GET /v1/bff/employer/dashboard (estancadas 3/5)
- [x] 2.8 Migración SQL con pgvector, HNSW, GIN y adaptadores PostgreSQL
- [ ] 2.9 Ejecutar la integración con pgvector real en CI (escrita; requiere Docker o el servicio de CI)

## 3. Frontend [apps/web]
- [x] 3.1 TK-FE-021: SkillRadarChart (lazy + tabla accesible), MatchScoreRing y ApplicationStepper con pruebas
- [x] 3.2 Portal del candidato: login de demo, vacantes, detalle con match, perfil (CV → skills), dashboard
- [x] 3.3 Portal del empleador: dashboard con estancadas, candidatos por match y cambio de estatus
- [x] 3.4 E2E con Playwright de los flujos HU-01/HU-02: `tests/e2e/core-flow.spec.ts` E2E-01…E2E-06 (prompt C10; falta la etiqueta `@smoke`, ver C9)

## 4. Calidad
- [x] 4.1 CI (.github/workflows/ci.yml): typecheck, cobertura, hooks, integración y build
- [ ] 4.2 Revisión adversarial del PR con el subagente (prompt C9) y registro en docs/reviews/
