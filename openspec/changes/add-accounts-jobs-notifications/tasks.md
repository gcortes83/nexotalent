# Tareas · add-accounts-jobs-notifications

## 1. Datos y dominio
- [x] 1.1 Migración `0002` (expand-only): `password_hash`, `jobs.job.closed_at/source_type/external_id`, estado `closed`, `notifications.notification`
- [x] 1.2 `shared/password.ts` (scrypt + política) · pruebas unitarias
- [x] 1.3 `jobs/domain/job-import.ts`: CSV RFC 4180, JSON CanonicalJob, segmentación de PDF, normalización ES/EN · pruebas unitarias
- [x] 1.4 `notifications/domain`: mensajes por estatus (qué va por email) · pruebas unitarias

## 2. Casos de uso y API
- [x] 2.1 Registro de candidato y de empleador; login por tipo de cuenta (401 uniforme)
- [x] 2.2 Perfil: `PUT /v1/candidates/me`, CV como archivo (`/resume/file`, PDF con magic bytes, TXT, MD)
- [x] 2.3 Vacantes: crear, editar, publicar, cerrar (soft delete) con aislamiento por organización
- [x] 2.4 Importación CSV/JSON/PDF con reporte por fila y upsert por `externalId`
- [x] 2.5 Notificaciones in-app + email (`EmailSender`: log | smtp/Mailpit) en preselección/oferta/contratación/rechazo y cierre
- [x] 2.6 Adaptadores en memoria y PostgreSQL; seed con contraseña de demo `Demo1234`
- [x] 2.7 `api/openapi.yaml` 0.2.0 y `apps/web/src/api/types.ts`
- [ ] 2.8 Integración PostgreSQL de los nuevos adaptadores (`make test-int`, requiere Docker)

## 3. Web
- [x] 3.1 Landing page con registro de candidatos, empleadores y vacantes
- [x] 3.2 Login con contraseña y pestañas; `/login?demo=1` conserva las cuentas de demo
- [x] 3.3 Formularios de registro de candidato y empleador
- [x] 3.4 Perfil del candidato: datos, CV (archivo o texto), skills y vacantes aplicadas con marcas
- [x] 3.5 Empleador: lista con filtros, crear/editar, publicar, cerrar con confirmación, importar con plantillas
- [x] 3.6 Toasts de notificaciones (polling 10 s) y marcas «Seleccionado» / «Vacante cerrada»

## 4. Pruebas y cierre
- [x] 4.1 HTTP (Fastify inject), páginas (Testing Library), funcionales en vivo (UC-11..UC-16) y E2E (E2E-10..E2E-16)
- [ ] 4.2 Revisión del subagente `adversarial-reviewer`
- [ ] 4.3 Ajustar el hook `pii-guard` (falso positivo con la tabla xref de PDFs: `0000000000 65535`)
- [ ] 4.4 Evidencia TDD (logs rojo → verde) de password, job-import, notificaciones y radares en `docs/evidence/`
- [ ] 4.5 Etiquetar `@smoke` los E2E críticos (E2E-01, E2E-04, E2E-13, E2E-14)

## 5. Iteraciones de la web (prompts C12–C18, 17/11/2026)
- [x] 5.1 Fondo animado de IA único en el layout (canvas, `prefers-reduced-motion`) y superficies de vidrio (C12)
- [x] 5.2 Footer global con placeholders de la compañía en `apps/web/src/site.ts` (C12)
- [x] 5.3 Lista de vacantes con filtros facetados, conteos, chips, orden, paginación y estado en la URL; `GET /v1/jobs` con `facets` (C13)
- [x] 5.4 Página de vacantes al 90 % del ancho, filtros de 320 px en una línea y buscador con ícono de lupa (C13)
- [x] 5.5 Salarios en USD mensuales (migración `0003`, importaciones rechazan otras monedas) (C13)
- [x] 5.6 Vacantes urgentes 🔥 (migración `0004`, filtro, formulario, CSV/JSON/PDF) (C13)
- [x] 5.7 Seed de 100 vacantes publicadas (18 urgentes) y 4 candidatos más con postulaciones recientes (C13, C17)
- [x] 5.8 Brillo difuminado de selección en la lista (1 s; colores combinados en urgentes) (C13)
- [x] 5.9 Diseño responsivo en todas las páginas + auditoría `tests/e2e/responsive.spec.ts` (C14)
- [x] 5.10 i18n ES/EN sin dependencias, selector fijo a la derecha y textos legales en dos líneas (C15)
- [x] 5.11 Detalle desde la tarjeta y postulación sin sesión con `?next=` seguro (C15)
- [x] 5.12 Descripciones detalladas deterministas de las 100 vacantes y componente `JobDescription` (C16)
- [x] 5.13 Soft skills opcionales en vacantes (taxonomía, API, CSV/JSON, formulario) y en verde en los radares (C17)
- [x] 5.14 Soft skills en el perfil del candidato (sección propia) y candidatos sembrados con más skills (C17)
- [x] 5.15 Dos radares vacante vs. candidato (técnicas y soft skills) en el detalle; 480 px detalle / 510 px landing (C17)
- [x] 5.16 Sección de apps móviles ocultable (✕ + enlace en el footer), leyenda animada y logo ×3 en la landing (C18)
- [x] 5.17 `make stop` (C18)

## 6. Documentación (prompt C19, 19/11/2026)
- [x] 6.1 `prompts.md`: prompts C10–C19 con el prompt original de la CLI y prompts operativos; C9 actualizado
- [x] 6.2 `design.md` y specs delta (`accounts`, `job-management`, `notifications`, `job-catalog`, `web-experience`, `candidate-profile`)
- [x] 6.3 `docs/06`, `docs/07`, `docs/08`, `docs/10`, `docs/13`, `docs/14`, `docs/15` y `CHANGELOG.md` al día
- [ ] 6.4 Archivar el change (fusionar las specs delta en `openspec/specs/`) después de la revisión adversarial (4.2)
