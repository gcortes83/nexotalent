# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado semántico.

## [Unreleased] · 0.2.0 · Cuentas, gestión de vacantes y notificaciones (change `add-accounts-jobs-notifications`)

### Added
- Registro de candidatos y de empleadores (crea la organización), login con correo y contraseña (scrypt) por tipo de cuenta; `/login?demo=1` conserva las cuentas de demo. Cuentas sembradas con contraseña `Demo1234`.
- Landing page pública con accesos a registro de candidatos, de empleadores y a vacantes.
- Perfil del candidato: datos profesionales, CV como archivo (PDF/TXT/MD) o texto, y tabla de vacantes aplicadas con marcas «Seleccionado» y «Vacante cerrada».
- Empleador: crear, editar, publicar y cerrar vacantes (soft delete, `status = closed`), e importar CSV, JSON (CanonicalJob) y PDF con reporte por fila y upsert por `externalId`.
- Notificaciones in-app (toasts) y por email (`EMAIL_PROVIDER=log|smtp`, Mailpit en Docker) al preseleccionar, ofertar, contratar, rechazar y cerrar vacantes.
- Fondo animado de IA (red neuronal en canvas con pulsos de datos, reacciona al puntero; respeta `prefers-reduced-motion`), el mismo en **todas las páginas** (montado una vez en el layout), con tarjetas y tablas «de vidrio» para la legibilidad.
- Vacantes en lista con filtros facetados (modalidad, seniority, país, salario mínimo, skills), conteos por opción, chips de filtros activos, orden, paginación y estado en la URL (compartible). `GET /v1/jobs` acepta esos filtros y devuelve `total`, `page`, `pageSize` y `facets`.
- Seed: 20 vacantes más (28 publicadas) en 3 empresas nuevas (Salud Digital, Logística, EdTech) con reclutadores `salud@`, `logistica@` y `edtech@example.com`; 6 países, rangos salariales y fechas de publicación variados.
- Salarios de las vacantes en **USD mensuales** (moneda única): seed convertido a montos en dólares, formato `US$5,500`, filtros de salario en USD, formulario sin selector de moneda e importaciones que rechazan otras monedas (422 por fila). Migración `0003_job_currency_usd.sql` (default `USD` + `CHECK ... NOT VALID`).
- Diseño responsivo en todas las páginas (≤ 480 / 720 / 1024 px): menú plegable con botón «Menú» en móvil, tablas que se convierten en tarjetas con etiquetas (`table--stack`), radar que se adapta al ancho, formularios y filtros en una columna, inputs de 16 px (sin zoom en iOS). Auditoría automática `tests/e2e/responsive.spec.ts`: 16 páginas × 3 anchos sin scroll horizontal.
- Vacantes urgentes («hot»): campo `urgent` (migración `0004_job_urgent.sql`), marca 🔥 «Urgente» animada en lista, detalle, landing, recomendadas y gestión del empleador; filtro «Solo vacantes urgentes» con conteo (`GET /v1/jobs?urgent=true`); casilla en el formulario y columna/propiedad `urgent` en CSV, JSON y PDF («(URGENTE)» o «Urgente: sí»).
- Seed ampliado a **100 vacantes publicadas** (72 generadas de forma determinista: 24 roles × 3 empresas nuevas —Banca Digital, AgroTech, Turismo— con reclutadores `banca@`, `agro@` y `turismo@example.com`), 18 urgentes.
- Página de vacantes al 90 % del ancho de la ventana (≥ 861 px) y panel de filtros de 320 px con cada opción en una sola línea (verificado en la auditoría responsiva).
- **Internacionalización ES/EN** sin dependencias (`apps/web/src/i18n`): diccionarios tipados (TypeScript exige las mismas claves en ambos idiomas), selector de idioma al pie de la página, elección recordada (`nexo.lang`) y `?lang=en|es`, `<html lang>` dinámico, fechas y moneda según el idioma; errores de la API traducidos por código, notificaciones y explicación del match redactadas en el cliente (la API envía `jobTitle` en las notificaciones).
- Flujo de postulación desde la lista: toda la tarjeta abre el detalle; sin sesión, el detalle invita a crear cuenta de candidato o iniciar sesión y regresa a la vacante (`?next=`, protegido contra redirecciones abiertas) con el botón Postular.
- Descripciones detalladas de las 100 vacantes sembradas (`apps/api/src/seed/job-descriptions.ts`, deterministas): Sobre el rol, Responsabilidades por familia de puesto, Requisitos derivados de las skills (nivel y obligatoriedad), Deseable, Qué ofrecemos (salario USD, modalidad, ciudad), Sobre la empresa y Proceso de selección. La web las muestra con encabezados y viñetas (`JobDescription`, sin HTML) y un extracto de dos líneas en la lista.
- Footer: selector de idioma fijo a la derecha y textos legales en dos líneas (una frase por línea).
- **Soft skills opcionales** en vacantes: taxonomía ampliada (Resolución de problemas, Adaptabilidad, Pensamiento crítico, Orientación al cliente, Gestión del tiempo, Negociación, Empatía), campo `softSkills` en la API y en CSV/JSON, sección propia en el formulario, el detalle y la descripción («Habilidades blandas»); 2 de cada 3 vacantes generadas las piden.
- Radar con soft skills en **verde** (`#34d399`) en el match y en la landing: etiqueta del eje, puntos y leyenda.
- Sección «Sigue tu proceso desde el celular» antes del footer con descargas de App Store y Google Play (URLs provisionales en `apps/web/src/site.ts`; se omite en el portal del empleador).
- `make stop`: detiene la API (:4000) y la web (:5173) locales.
- Detalle de vacante con **dos radares por skill** (vacante vs. candidato): skills técnicas y soft skills (verde); un eje por skill que pide la vacante con el nivel confirmado del candidato; si hay menos de 3 ejes se completa con skills del perfil (y comunes) y se avisa. Radares +50 %: 480 px en el detalle y 510 px en la landing; etiquetas largas en dos líneas.
- Perfil del candidato con sección propia de **soft skills** (ver, agregar y ajustar nivel; en verde), separada de las skills técnicas; se confirman juntas. 4 candidatos registrados más con skills técnicas y soft skills (Valeria, Diego, Mariana, Jorge; `@example.com`, contraseña `Demo1234`) y 6 postulaciones recientes.
- Logo «NexoTalent ✦» de la parte superior izquierda al triple de tamaño en la landing (55 px; ajustado en móvil). En el detalle, el match ocupa todo el ancho con el radar (320 px) a la derecha del texto.
- Candidatos sembrados con más skills: Ana 17 (12 técnicas + 5 soft skills) y Luis 15 (10 + 5); Sofía sigue sin skills (flujo «candidata nueva»). Taxonomía ampliada con GraphQL, Vue.js, Angular, MongoDB y CI/CD. En el perfil, las soft skills se distinguen en verde.
- Leyenda en la parte superior derecha de la landing: «NexoTalent: la primera plataforma enfocada en los candidatos TI.» (ES/EN, «NexoTalent» con el diseño del logo) con ícono animado a la derecha (persona con halo y destello; sin animación con `prefers-reduced-motion`).
- La sección de apps móviles se oculta con un ícono ✕ (arriba a la derecha; preferencia recordada en `nexo.hideApps`) y se vuelve a mostrar desde el footer («📱 NexoTalent en tu dispositivo móvil»).
- Buscador de vacantes al 90 % de la página con ícono de lupa en lugar de botón.
- Selección de vacante en la lista (hover, foco o última abierta al volver): brillo difuminado tenue (1 s) que se contrae hasta un borde nítido en degradado; en vacantes urgentes combina los colores de selección (violeta/cian) y de urgente (naranja/rojo). Sin animación con `prefers-reduced-motion`.
- Footer global con navegación y datos de la compañía; los placeholders se editan en `apps/web/src/site.ts`.
- Migración `0002_accounts_jobs_notifications.sql` (expand-only), OpenAPI 0.2.0, `make mail-up`.
- Pruebas: API 120, web 45, funcionales en vivo 42, E2E 12.

### Documentation
- `prompts.md`: prompts C10–C19 enviados desde la CLI (versión reproducible + prompt original con hora), prompts operativos, estado de ejecución al 19/11/2026 y C9 con los pendientes actualizados.
- OpenSpec: `design.md` y specs delta (`accounts`, `job-management`, `notifications`, `job-catalog`, `web-experience`, `candidate-profile`) del change `add-accounts-jobs-notifications`; `tasks.md` con las iteraciones web (§5) y la documentación (§6); `add-core-mvp` 3.4 (E2E) marcada como hecha; `project.md` con las capacidades nuevas.
- `docs/06` (migraciones 0002–0004), `docs/07` (endpoints de OpenAPI 0.2.0), `docs/08` (rutas y transversales del MVP web), `docs/10` (inventario real de pruebas), `docs/13` (HU-16…HU-21 y estado en el MVP), `docs/14` (TK-QA-001/002, TK-BE-020…023, TK-FE-030…033, TK-DATA-002) y `docs/15` (tabla de fases corregida y actualización del 19/11).
- Conteo verificado con `make test` (19/11/2026): API 137, web 81 y hooks 31 en verde.

### Known issues
- `deployment.md` no existe (el prompt se interrumpió); el hook `protect-files` bloquea escrituras en el scratchpad de la sesión.
- El hook `pii-guard` marca como teléfono la tabla xref de los PDFs de prueba; `make test-int` de los nuevos adaptadores no se ejecutó (Docker apagado).

## 0.1.0 · Núcleo MVP web (change `add-core-mvp`)

### Added
- Harness real del agente: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, hooks `block-dangerous`, `protect-files` y `pii-guard` con 31 pruebas, subagentes `adversarial-reviewer`, `test-writer` y `spec-checker`, y comandos `/tdd` y `/review-pr`.
- OpenSpec: `project.md`, specs `matching`, `applications-pipeline` y `candidate-profile`, y los changes `add-core-mvp` y `add-mobile-support` (PENDIENTE).
- `api/openapi.yaml` del núcleo, con los dashboards de candidato y empleador.
- `apps/api` (monolito modular hexagonal):
  - Fórmula de match híbrida con radar y explicación (TDD).
  - Máquina de estados de la postulación (TDD).
  - Extracción de skills del CV (mock) con confirmación humana.
  - Postular, retirar y cambiar estatus con `If-Match`.
  - Dashboards con stepper y postulaciones estancadas 3/5.
  - Adaptadores en memoria y PostgreSQL + pgvector, migración `0001`, seed sintético.
- `apps/web`:
  - Login de demo, vacantes, detalle con `SkillRadarChart` y `MatchScoreRing`, y perfil (CV → skills).
  - Dashboard del candidato con `ApplicationStepper`.
  - Dashboard del empleador y candidatos por match con cambio de estatus.
- CI (`.github/workflows/ci.yml`), `docker-compose.yml` y `Dockerfile` de la API.
- ADR-0001 (monolito modular) y los tickets TK-DATA-001 y TK-BE-015.

- Pruebas unitarias adicionales: `config`, casos de uso de jobs/resume/applications (API) y listado de vacantes, guardas de rol y sesión (web).
- Pruebas funcionales en vivo (`tests/functional`, `node:test`, 34 casos UC-00…UC-10 y web) y E2E con Playwright (`tests/e2e`, 5 escenarios); job `functional` en CI.
- Docker: `apps/web/Dockerfile` (nginx sin privilegios con proxy `/v1`), servicios `postgres-test`, `migrate`, `api` y `web` en `docker-compose.yml`; CLI `dist/cli/db.js migrate|seed` en la imagen de la API.
- `Makefile` (`setup`, `build [backend|frontend]`, `db-up`, `start`, `test-*`, `docker-*`, `help`) y plantillas `apps/api/env.example` y `apps/web/env.example`.

### Changed
- `readme.md` → `README.md` con «Inicio rápido»: instalación local y Docker, URLs, cuentas de demo, comandos `make` y pruebas.
- `apps/api/scripts/*` sustituidos por `src/cli/db.ts`; `npm run dev`, `db:migrate` y `db:seed` cargan `apps/api/.env` si existe.
- `docs/04`, `docs/06`, `docs/07`, `docs/14`, `docs/15` y `readme.md`: costuras cerradas según el feedback de la 1.ª entrega (estados, dashboard, `rag_chunks` a v2, Calendly manual en el MVP, instalación real).
- `prompts.md`: estado de ejecución y FASE C ejecutada. `ios-prompts.md` y `android-prompts.md` marcados como PENDIENTES.
