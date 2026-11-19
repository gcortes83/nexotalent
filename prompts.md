# prompts.md · NexoTalent AI

Prompts para construir **NexoTalent AI** con un agente de código (Claude Code o cualquier agente compatible con `AGENTS.md`), en orden: **diseño y documentación → specs → desarrollo backend → frontend → pruebas → despliegue en AWS**. Los prompts de las apps nativas están en `android-prompts.md` e `ios-prompts.md` (⏸️ **PENDIENTES**: la implementación y las pruebas de mobile no se han ejecutado).

---

## Cómo usar este archivo

1. **Un prompt por sesión** (o por tarea). Inicia cada sesión en el repo indicado en `📁 Repo`.
2. Antes de cada prompt de construcción, pega el **Prompt 0 · Brief del proyecto** o asegúrate de que el agente lea `AGENTS.md` y `nexo-specs/docs/`.
3. Usa **modo plan** en prompts marcados con 🧭: el agente propone un plan, tú lo apruebas y luego ejecuta.
4. Tras cada prompt marcado con 🛡️, ejecuta el **Prompt R · Revisión adversarial**.
5. Guarda evidencia (diffs, logs de hooks, reportes de evals) para la entrega del curso.
6. Los marcadores entre `{{ }}` son variables que debes sustituir.

**Leyenda:** 📁 repo de trabajo · 🧭 usar modo plan · 🛡️ requiere revisión adversarial · 🧪 TDD obligatorio · 📚 módulo del curso.

---

## Estado de ejecución (actualizado el 19 de noviembre de 2026) · tras el feedback de la 1.ª entrega

El feedback de LIDR (luz amarilla) pidió **congelar un núcleo pequeño de punta a punta**, simular lo que no es núcleo,
empezar con un **monolito modular**, convertir el harness en ficheros reales y **arrancar con TDD**. Por eso este archivo
tiene ahora tres partes:

1. **FASE C · Núcleo MVP web (ejecutada)**: prompts C0–C8, ya ejecutados en este repo, y C9 con los pendientes. Es la evidencia de Implementación y Pruebas con IA.
2. **FASE C (continuación) · Iteraciones de la aplicación web (ejecutada)**: prompts C10–C19 enviados desde la línea de comandos el 17 y el 19/11/2026 (cuentas, gestión e importación de vacantes, notificaciones, landing, catálogo, i18n, responsivo, soft skills), con el prompt original de cada uno.
3. **Fases 0–7 originales**: la visión completa (polyrepo y microservicios), que pasa a ser **v2**. Cada fase lleva su estado.

| Fase del ciclo | Estado | Evidencia |
|---|---|---|
| Análisis | ✅ con IA | `docs/01`, `docs/13`, este archivo (P1.x) |
| Diseño | ✅ con IA | `docs/02`–`docs/14`, `api/openapi.yaml` (0.2.0), `openspec/`, `docs/adr/0001` |
| **Implementación** | ✅ **con IA** | `AGENTS.md`, `.claude/` (hooks probados, subagentes, comandos), `apps/api`, `apps/web` (C0–C7, C10–C18) |
| **Pruebas** | ✅ **con IA** | TDD rojo→verde en `docs/evidence/`; **137 tests de API + 81 de web + 31 de hooks** (`make test`, 19/11/2026); funcionales en vivo (`tests/functional`, UC-00…UC-16) y E2E con Playwright (`tests/e2e`, E2E-01…E2E-24 + auditoría responsiva); CI en `.github/workflows/ci.yml` (C2, C3, C8, C10) |
| Despliegue | ⏳ pendiente (versión mínima; `deployment.md` no generado) | se generará con sus propios prompts (C9) |
| Mantenimiento | ⏳ pendiente | se generará con sus propios prompts |
| **Mobile iOS / Android** | ⏸️ **PENDIENTE** (implementación y pruebas) | `ios-prompts.md`, `android-prompts.md`, `openspec/changes/add-mobile-support` |

**Qué entra en el núcleo:** subir CV → confirmar skills → radar y score → postular → stepper → el reclutador cambia el estatus
(+ estancadas a 3/5 días en el dashboard).
**Qué se agregó después (change `add-accounts-jobs-notifications`, C11–C18):** registro y login con contraseña, perfil del
candidato, gestión, cierre (soft delete) e importación CSV/JSON/PDF de vacantes, notificaciones in-app + email, landing,
catálogo con filtros facetados, vacantes urgentes, salarios en USD, soft skills con radares propios, i18n ES/EN y diseño responsivo.
**Qué se simula:** pago (`paid_simulated`), Calendly (enlace fijo; `interview_scheduled` manual), Cognito (login de demo o contraseña local), Bedrock (`AI_PROVIDER=mock`), email (`EMAIL_PROVIDER=log|smtp` con Mailpit).
**Qué pasa a v2:** auto-apply, copiloto RAG (`rag_chunks`), servidor MCP, conectores empresariales, WhatsApp/Slack/Teams/push, ingesta por API pull programada, admin, **apps móviles**.

---

## Prompt 0-MVP · Brief del núcleo (contexto reutilizable para la FASE C)

```text
Eres un ingeniero senior en NexoTalent AI. Lee AGENTS.md antes de nada: es el contrato de trabajo.
- Repo: gcortes83/nexotalent, monorepo del NÚCLEO MVP (ADR-0001: monolito modular).
- apps/api: Node 24, TypeScript estricto, Fastify 5, Zod, postgres.js + PostgreSQL 16 + pgvector. Hexagonal:
  src/modules/<ctx>/{domain,application}, src/ports.ts, src/infra/{http,db,memory,ai}.
- apps/web: React 19, Vite, TanStack Query, React Router, Recharts, Vitest + Testing Library.
- Núcleo: subir CV → confirmar skills → radar y score → postular → stepper → el reclutador cambia el estatus.
- Simulado: pago, Calendly, ingesta (seed), Cognito (demo login), Bedrock (AI_PROVIDER=mock).
- Fuera de alcance: todo lo marcado v2 en openspec/changes/add-core-mvp/proposal.md, incluidas las apps móviles (PENDIENTE).
REGLAS: un ticket a la vez; TDD (muestra el rojo y guarda el log en docs/evidence/); solo datos example.com;
nunca leas .env; contrato en api/openapi.yaml + apps/web/src/api/types.ts; si algo es ambiguo, pregunta.
```

---

# FASE C · Núcleo MVP web ✅ EJECUTADA 📚 M1, M3, M5, M10, M11, M12

> Prompts ejecutados el 17/11/2026 con Claude Code sobre este repo, en orden. Cada uno indica sus entregables reales.

### C0 · Harness real del agente ✅ 📚 M1, M5
```text
[Prompt 0-MVP]
Convierte docs/12-harness-sdd-guardrails.md en ficheros reales de este repo:
1. AGENTS.md (contexto, mapa del repo, comandos, reglas: un ticket a la vez, TDD, hexagonal, contrato, ética del match,
   datos sintéticos, fuera de alcance, definición de terminado) y CLAUDE.md con @AGENTS.md.
2. .claude/settings.json con permisos allow/deny y hooks PreToolUse.
3. Hooks en Node (.mjs) con una función pura decide() y pruebas con node:test, que registren cada bloqueo en
   harness-log.jsonl:
   - block-dangerous: borrado recursivo forzado, push forzado o directo a main, reset duro, destroy/deploy de CDK,
     borrados en AWS, perfiles de producción, pipe de curl a shell, publicar en npm, SQL destructivo, leer .env.
   - protect-files: .env, secretos, migraciones ya existentes, archivos fuera del repo, package-lock.
   - pii-guard: emails fuera de example.com, CURP, RFC, tarjetas (salvo la 4242 de Stripe), teléfonos en fixtures.
4. Subagentes .claude/agents/: adversarial-reviewer (solo lectura), test-writer (solo fase roja), spec-checker.
5. Comandos .claude/commands/: /tdd y /review-pr.
```
**Entregables:** `AGENTS.md`, `CLAUDE.md`, `.claude/**` · 31 tests de hooks en verde.
**Evidencia real:** durante esta misma sesión el hook `block-dangerous` bloqueó un comando del agente (registrado en `harness-log.jsonl`).
Fue un falso positivo: la cadena peligrosa aparecía solo como texto dentro de un heredoc. Mejora pendiente: ignorar contenido entre comillas o en heredocs.

### C1 · OpenSpec y cierre de costuras del diseño ✅ 📚 M2, M3
```text
[Prompt 0-MVP]
1. Crea openspec/project.md y las specs del núcleo con SHALL/MUST y escenarios GIVEN/WHEN/THEN: matching,
   applications-pipeline y candidate-profile. Crea el change add-core-mvp (proposal, design, tasks por app) y el change
   add-mobile-support en estado PENDIENTE.
2. Cierra las costuras señaladas en el feedback:
   - api/openapi.yaml del núcleo, con GET /v1/bff/candidate/dashboard y GET /v1/bff/employer/dashboard.
   - Alinea los estados: PATCH /status acepta RecruiterSettableStatus; withdrawn por POST /withdraw; 409/412/428.
   - Decide sobre rag_chunks (se aplaza a v2) y actualiza docs/06, docs/14 y readme.
   - Calendly: en el MVP es manual; en v2 lo fija el webhook con actor system (docs/04 y docs/07).
   - Agrega los tickets TK-DATA-001 (datos de entrada del match) y TK-BE-015 (dashboard) a docs/14.
   - Arregla el readme: instalación real (sin nexo-workspace/repos.yaml) y estructura actual.
3. Registra la decisión en docs/adr/0001-monolito-modular-mvp.md.
```
**Entregables:** `openspec/**`, `api/openapi.yaml`, `docs/adr/0001-*.md`, `docs/04`, `docs/06`, `docs/07`, `docs/14`, `readme.md`.
**Pendiente:** ejecutar `npm run lint:api` (Redocly) y guardar el resultado.

### C2 · TDD de la fórmula de match (TK-BE-012) ✅ 🧪 📚 M11
```text
[Prompt 0-MVP] Usa el subagente test-writer.
Escribe PRIMERO las pruebas Vitest de computeMatch(candidate, job, similarity) según docs/03 §3 y la spec matching:
cobertura total (score 0.94), skill obligatoria faltante (−0.10, missingMustHaves), candidata sin skills (score 0,
radar en 0), solo skills confirmadas, pesos, tope de cobertura 1, tope de penalización 0.30 y score ≥ 0, similitud
acotada, seniority (lead/senior/mid/junior/desconocida), preferencias (modalidad, país, salario), atributos protegidos
ignorados, radar ponderado con máximo 8 ejes ("Otros"), fortalezas/brechas ordenadas y explicación determinista.
Ejecuta y guarda el ROJO en docs/evidence/tdd-match-red.log. Luego implementa la función pura hasta VERDE.
```
**Entregables:** `apps/api/test/unit/match-formula.test.ts` (20 tests), `src/modules/matching/domain/match-formula.ts`,
`docs/evidence/tdd-match-{red,green}.log`.

### C3 · TDD de la máquina de estados de la postulación ✅ 🧪
```text
[Prompt 0-MVP] Usa el subagente test-writer.
Pruebas primero de canTransition(from, to, actor) para recruiter, candidate y system: avances válidos, cancelación de
entrevista (interview_scheduled → shortlisted), rechazo desde cualquier estado activo, sin saltar etapas, retirar solo
la candidata, solo humanos a rejected/hired, terminales sin salida. Guarda el rojo en docs/evidence/tdd-status-red.log
e implementa.
```
**Entregables:** `test/unit/application-status.test.ts` (27 tests), `src/modules/applications/domain/status.ts`,
`docs/evidence/tdd-status-{red,green}.log`.

### C4 · Datos de entrada del match (TK-DATA-001) ✅ 🧪
```text
[Prompt 0-MVP]
1. Seed sintético compartido (memoria y Postgres): taxonomía de 30 skills en 8 categorías, 2 organizaciones, 9 vacantes
   (1 en borrador), 3 candidatos (uno sin skills), postulaciones con 1, 4 y 6 días sin cambio, embeddings de 1024 dimensiones
   por hashing.
2. Puerto SkillExtractor con adaptador mock por taxonomía (alias, límites de palabra, nivel por contexto, evidencia;
   el CV es dato no confiable) y puerto Embedder.
3. Pruebas: alias, Java ≠ JavaScript, prompt injection en el CV, determinismo del embedding y similitud relativa.
```
**Entregables:** `src/seed/seed-data.ts`, `src/modules/candidates/domain/taxonomy-skill-extractor.ts`,
`src/modules/matching/domain/embedding.ts`, `test/unit/extractor-and-embedding.test.ts`.

### C5 · Casos de uso, API HTTP y persistencia ✅ 🧪 🛡️
```text
[Prompt 0-MVP]
Implementa los casos de uso sobre los puertos de src/ports.ts y la API Fastify según api/openapi.yaml:
demo-login (JWT HS256, solo con DEMO_AUTH=true), jobs, match con caché + ETag/304, resume → skills propuestas,
confirmar skills (recalcula el embedding e invalida la caché), postular (único, contador), retirar, dashboard del
candidato (stepper + 3 recomendadas), candidatos por match, PATCH de estatus (If-Match → 428/412, 409 con from/to,
404 entre organizaciones, hired incrementa posiciones cubiertas) y dashboard del empleador con estancadas 3/5.
Errores RFC 9457 y logs con redacción de PII. Adaptadores en memoria (tests y demo) y PostgreSQL (postgres.js + SQL),
migración 0001 expand-only con pgvector, HNSW, GIN e índice parcial de estancadas, runner de migraciones y seed.
Pruebas HTTP con app.inject y reloj fijo; integración con pgvector real condicionada a TEST_DATABASE_URL.
```
**Entregables:** `apps/api/src/**`, `migrations/0001_core_schema.sql`, `test/http/*.test.ts` (2 archivos, 25 tests),
`test/integration/postgres-adapters.test.ts`, `Dockerfile`, `docker-compose.yml` · cobertura de dominio y aplicación: 93 % de sentencias.
**Pendiente:** ejecutar la integración contra PostgreSQL (requiere Docker o el CI).

### C6 · Componentes de dominio web (TK-FE-021) ✅ 🧪
```text
[Prompt 0-MVP] Usa la skill frontend-design si está disponible.
En apps/web crea SkillRadarChart (Recharts cargado lazy, vacante con línea discontinua y candidato como área,
prefers-reduced-motion, tabla alternativa sr-only), MatchScoreRing (role=meter con tono por rango) y ApplicationStepper
(aria-current="step", estados done/current/upcoming/stopped y terminal). Tokens CSS dark-first con modo claro.
Pruebas con Testing Library por rol y nombre accesible.
```
**Entregables:** `apps/web/src/components/*`, `src/styles.css`, 9 pruebas de componentes.

### C7 · Portales del candidato y del empleador ✅ 🧪 🛡️
```text
[Prompt 0-MVP]
apps/web con React Router y TanStack Query:
- Login de demo con cuentas sintéticas; rutas protegidas por rol.
- Candidato: vacantes con búsqueda, detalle con score + radar + fortalezas/brechas + postular, perfil
  (pegar CV → ✦ skills propuestas → ajustar nivel, desmarcar o agregar → confirmar), dashboard con stepper,
  retiro y recomendadas.
- Empleador: dashboard con estancadas 3/5 días y vacantes (posiciones cubiertas, postulantes), candidatos por match con
  solo las transiciones válidas, If-Match y mensaje claro ante 412.
- Cliente API tipado con correlation id y Problem Details.
Pruebas de página con fetch simulado por ruta (fakeApi) y router en memoria. Presupuesto: JS inicial < 180 KB gzip.
```
**Entregables:** `apps/web/src/{api,auth,pages}/**` · 26 tests web en verde · cobertura de líneas 91 % · JS inicial de 116 KB gzip.

### C8 · CI de pruebas ✅
```text
[Prompt 0-MVP]
Crea .github/workflows/ci.yml para PRs y main: npm ci, typecheck, coverage con umbral, pruebas de hooks, integración con
el servicio pgvector/pgvector:pg16 y build. Permisos mínimos (contents: read).
```

### C9 · Pendientes de Implementación y Pruebas (web) ⏳ (actualizado el 19/11/2026)
> El punto 1 original (E2E de HU-01/HU-02 con trazas) quedó **cubierto en C10** por `tests/e2e/core-flow.spec.ts` (E2E-04,
> flujo completo candidata ↔ reclutador; `trace: 'retain-on-failure'`). Falta solo la etiqueta `@smoke`.
```text
[Prompt 0-MVP]
1. Etiqueta @smoke los E2E críticos (E2E-01, E2E-04, E2E-13, E2E-14) y agrega npm run test:smoke.
2. Ejecuta el subagente adversarial-reviewer sobre los changes add-core-mvp y add-accounts-jobs-notifications; guarda el
   resultado en docs/reviews/ y corrige los BLOCKER.
3. Con Docker encendido: npm run lint:api (Redocly) y make test-int (incluye los adaptadores PostgreSQL de cuentas, vacantes
   y notificaciones y las migraciones 0002–0004); adjunta las salidas a docs/evidence/.
4. Harness: block-dangerous no debe bloquear texto dentro de comillas o heredocs (falso positivo de C0); pii-guard no debe
   marcar como teléfono la tabla xref de los PDFs de prueba (`0000000000 65535`); protect-files debe permitir el directorio
   scratchpad de la sesión (bloqueado el 19/11/2026 en C19).
5. Guarda evidencia TDD de C11–C17 en docs/evidence/ (logs rojo→verde de password, job-import, notificaciones y radares).
6. Genera deployment.md (pasos de despliegue de la versión mínima) y los prompts de Despliegue y Mantenimiento.
```

---

# FASE C (continuación) · Iteraciones de la aplicación web ✅ EJECUTADA 📚 M1, M3, M11, M12

> Prompts enviados desde la línea de comandos (Claude Code) el **17/11/2026**, después de C0–C9. Cada bloque `text` es la
> versión **reproducible** del prompt (redactada para que otro agente obtenga el mismo resultado); debajo se conservan los
> **prompts originales**, con su hora, como evidencia de la sesión. El detalle de lo entregado está en `CHANGELOG.md` (0.1.0 y
> 0.2.0) y en `openspec/changes/add-accounts-jobs-notifications/tasks.md`.

### C10 · Pruebas unitarias y funcionales, Docker, Makefile y README ✅ 🧪
```text
[Prompt 0-MVP]
1. Completa las pruebas unitarias de backend (config, casos de uso de jobs, resume y applications) y de frontend
   (listado de vacantes, guardas de rol y sesión).
2. Crea pruebas funcionales "en vivo" (tests/functional, node:test) que recorran todos los casos de uso (UC-00…UC-10)
   contra la API y la web ejecutándose localmente (API_URL, WEB_URL), y E2E con Playwright (tests/e2e) con trazas en los fallos.
3. Docker: apps/web/Dockerfile (nginx sin privilegios con proxy /v1) y servicios postgres, postgres-test, migrate, api y web en
   docker-compose.yml; la imagen de la API incluye el CLI dist/cli/db.js migrate|seed.
4. Makefile con setup (instala, crea los .env desde env.example, levanta las bases y migra), build [backend|frontend],
   db-up (espera a que estén sanas), start (API + web; Ctrl-C detiene ambas), test-*, docker-* y help.
5. README.md con inicio rápido: instalación local y en Docker, compilación, ejecución, URLs locales, cuentas de demo,
   comandos make y cómo correr cada tipo de prueba. Agrega el job functional al CI.
```
**Entregables:** `tests/functional/**`, `tests/e2e/core-flow.spec.ts` (E2E-01…E2E-06), `apps/web/Dockerfile`, `docker-compose.yml`,
`Makefile`, `apps/{api,web}/env.example`, `apps/api/src/cli/db.ts`, `README.md` (antes `readme.md`).

<details><summary>Prompt original (08:25)</summary>

> Generar pruebas unitarias para el frontend y el backend. Generar pruebas funcionales en tiempo real para verificar todos los
> casos de uso en la aplicación ejecutándose localmente. Configurar el proyecto para que se ejecute en Docker. Genera el makefile
> con: `make setup` (solo la primera vez: instala dependencias, crea los .env, levanta las bases y migra), `make build`,
> `make build backend`, `make build frontend`, `make db-up` (levanta las dos bases de datos y espera a que estén sanas),
> `make start` (levanta backend y frontend a la vez; Ctrl-C para los dos), `make help`. Generar un archivo README.md para el
> proyecto que incluya instrucciones de configuración, compilación y ejecución (tanto en Docker como de forma local), así como
> las URL para realizar pruebas en el entorno local, incluye los comandos make del proyecto.
</details>

### C11 · Cuentas, perfil, gestión e importación de vacantes, notificaciones y landing ✅ 🧪 🛡️
```text
[Prompt 0-MVP]
Crea el change openspec/changes/add-accounts-jobs-notifications (proposal + tasks) y luego impleméntalo con TDD:
1. Registro de candidatos y de empleadores (el empleador crea su organización y queda como employer_admin). Login con
   correo y contraseña (scrypt) separado por tipo de cuenta; /login?demo=1 conserva las cuentas de demo (DEMO_AUTH=true).
2. Perfil del candidato: actualizar datos, subir el CV como archivo (PDF validado por magic bytes, TXT, MD) o texto y ver sus
   vacantes aplicadas.
3. Empleador: crear (borrador o publicada, pago simulado), editar, publicar y cerrar vacantes (soft delete: status=closed,
   closed_at), e importar 1..N vacantes en CSV (plantilla), JSON (CanonicalJob) y PDF (formatos de docs/04) con reporte por
   fila y upsert por externalId.
4. Al preseleccionar, ofertar, contratar, rechazar o cerrar la vacante, notifica al candidato in-app (tabla
   notifications.notification + toast con polling) y por email (puerto EmailSender: log en desarrollo, smtp → Mailpit en
   Docker; make mail-up). Muestra las marcas «Seleccionado» y «Vacante cerrada» en la lista de vacantes aplicadas.
5. Landing page moderna que se sienta AI-native, con accesos a registro de candidatos, de empleadores y a vacantes.
Migración 0002 expand-only, OpenAPI 0.2.0 + apps/web/src/api/types.ts, pruebas HTTP, de páginas, funcionales (UC-11…UC-16)
y E2E (E2E-10…E2E-16).
```
**Entregables:** `openspec/changes/add-accounts-jobs-notifications/*`, `migrations/0002_accounts_jobs_notifications.sql`,
`src/shared/password.ts`, `src/modules/jobs/domain/job-import.ts`, `src/modules/notifications/**`, páginas `LandingPage`,
`LoginPage`, `RegisterPages`, `ProfilePage`, `EmployerJobsPage`, `JobFormPage`, `ImportJobsPage` y `NotificationWatcher`.

<details><summary>Prompt original (09:30)</summary>

> Crea el form de registro de candidatos y de empleadores. Haz que el login con un param en la url me permita entrar con la
> página que se ve ahora, y sin el parámetro en la url que muestre el login de candidatos o de empleadores, username password.
> Crea la página donde el candidato pueda subir su resume, actualizar su información y ver las vacantes aplicadas. Crea la
> página donde el empleador pueda crear y administrar vacantes, o importar vacantes con los formatos de archivos indicados.
> También debe poder cerrar vacantes (soft delete) y notificar a los candidatos en las posiciones que aplicaron en la app, y
> vía email. Debe aparecer un toast message si el candidato fue seleccionado o la vacante se cerró, al igual que la marca en la
> lista de las vacantes aplicadas. Crea el landing page moderna, que haga sentir que usa AI, que contenga las opciones de
> registro de candidatos, empleadores, vacantes.
</details>

### C12 · Fondo animado de IA y footer ✅
```text
[Prompt 0-MVP]
1. Fondo animado alusivo a IA (red neuronal en canvas con pulsos de datos que reacciona al puntero; estático con
   prefers-reduced-motion). Móntalo UNA sola vez en el layout para que todas las páginas (landing, login, registro,
   vacantes y portales) usen el mismo fondo; usa tarjetas y tablas "de vidrio" para mantener la legibilidad.
2. Footer global con navegación y datos de la compañía como placeholders editables en apps/web/src/site.ts.
```
**Entregables:** `components/AiBackground.tsx`, `components/SiteFooter.tsx`, `site.ts`, estilos de vidrio en `styles.css`.

<details><summary>Prompts originales</summary>

- (10:02) «Genera una animación de fondo alusiva a AI en el landing page y en el login. Agrega un footer con placeholders de la página y de la compañía.»
- (10:40) «Coloca una imagen de fondo en la página de vacantes.» · (10:42) «Mejora la imagen de fondo.»
- (11:11) «Agrega la imagen de fondo a la página de crear cuenta.» · (11:15) «Usa el mismo background del landing page en todas.»
</details>

### C13 · Catálogo de vacantes: lista, filtros, urgentes, USD y 100 vacantes ✅ 🧪
```text
[Prompt 0-MVP]
1. Vacantes en forma de lista con filtros facetados (modalidad, seniority, país, salario mínimo, skills, solo urgentes),
   conteos por opción, chips de filtros activos, orden, paginación y estado en la URL. GET /v1/jobs acepta esos filtros y
   devuelve total, page, pageSize y facets (OpenAPI + types.ts).
2. La página de vacantes usa el 90 % del ancho (≥ 861 px); panel de filtros de 320 px con cada opción en una sola línea.
   El buscador ocupa el 90 % y usa un ícono de lupa en lugar de botón.
3. Salarios en USD mensuales como moneda única: seed en dólares, formato US$5,500, filtros en USD, formulario sin selector
   de moneda e importaciones que rechazan otras monedas (422 por fila). Migración 0003 (default USD + CHECK NOT VALID).
4. Vacantes urgentes («hot»): campo urgent (migración 0004 con índice parcial), marca 🔥 «Urgente» animada en lista,
   detalle, landing, recomendadas y gestión del empleador; casilla en el formulario y columna urgent en CSV/JSON/PDF.
5. Seed determinista hasta 100 vacantes publicadas (empresas y reclutadores nuevos @example.com), 18 urgentes.
6. Selección de vacante en la lista (hover, foco o la última abierta al volver): brillo difuminado tenue de 1 s que se
   contrae hasta un borde nítido en degradado; en urgentes combina los colores de selección y de urgente. Sin animación
   con prefers-reduced-motion.
```
**Entregables:** `pages/JobsPage.tsx`, `components/UrgentBadge.tsx`, `migrations/0003_job_currency_usd.sql`,
`migrations/0004_job_urgent.sql`, `seed/seed-data.ts`, E2E-06.

<details><summary>Prompts originales</summary>

- (10:19) «Mejora la vista de las vacantes en forma de lista y mejora los filtros de búsqueda.»
- (10:26) «Agrega 20 vacantes más.» · (11:01) «Agrega vacantes hasta que se llegue a un número de 100.»
- (10:35) «La moneda del salario de las vacantes debe ser en dólares.»
- (11:01) «Agrega un ícono de las vacantes urgentes, hot vacantes.»
- (11:09) «La lista de vacantes debe usar el 90 % del ancho de la página y el texto del menú izquierdo no debe estar en 2 líneas.»
- (11:57) «Cuando seleccione una vacante en la lista, el borde de la vacante debe tener un efecto de difuminado a nada difuminado; si es una vacante urgente debe hacerlo con los dos colores de selección y de urgente.»
- (12:10) «Reduce el efecto difuminado de la selección de vacantes en la lista, más tenue y más lento, a 1 s.»
</details>

### C14 · Diseño responsivo en todas las páginas ✅ 🧪
```text
[Prompt 0-MVP]
Haz responsivas todas las páginas con cortes en 480, 720 y 1024 px: menú plegable con botón «Menú» en móvil, tablas que se
convierten en tarjetas con etiquetas (table--stack), radar que se adapta al ancho, formularios y filtros en una columna e
inputs de 16 px (sin zoom en iOS). Agrega una auditoría Playwright (tests/e2e/responsive.spec.ts) que recorra todas las
páginas en 3 anchos y falle si hay scroll horizontal.
```
<details><summary>Prompt original (10:49)</summary>

> Haz que toda la aplicación tenga un diseño responsivo en todas las páginas.
</details>

### C15 · Internacionalización ES/EN y postulación desde la lista ✅ 🧪
```text
[Prompt 0-MVP]
1. i18n ES/EN sin dependencias en apps/web/src/i18n: diccionarios tipados (TypeScript exige las mismas claves en ambos),
   selector de idioma al pie de la página, elección recordada (nexo.lang) y ?lang=en|es, <html lang> dinámico, fechas y
   moneda según el idioma; errores de la API traducidos por código; notificaciones y explicación del match redactadas en
   el cliente (la API envía jobTitle en las notificaciones).
2. Toda la tarjeta de la lista abre el detalle de la vacante. Sin sesión, el detalle invita a crear cuenta de candidato o a
   iniciar sesión y regresa a la vacante con ?next= (protegido contra redirecciones abiertas) para postular.
3. Footer: el selector de idioma queda fijo a la derecha aunque cambie el idioma, y los textos legales ocupan siempre dos
   líneas (una frase por línea).
Pruebas: i18n.test.tsx y E2E-20…E2E-24 (incluye las 2 líneas exactas del footer en ES/EN y en varios anchos).
```
<details><summary>Prompts originales</summary>

- (11:20) «Implementa el cambio de idioma de ES y EN, pon el selector de idioma en la parte inferior del landing page. Implementa la internacionalización en ES y EN. En la lista de vacantes, al hacer click debe abrirme la página con los detalles de la vacante así como la de aplicar; para aplicar debo registrarme como candidato.»
- (11:34) «El selector de idioma debe siempre estar del lado derecho; se mueve cuando hay cambio de idioma.»
- (11:35) «El texto siguiente siempre debe estar en 2 líneas: © 2026 NexoTalent AI · [Razón social de la compañía S.A. de C.V.]. All rights reserved. / AI guides; hiring decisions are always made by people.»
</details>

### C16 · Descripciones detalladas de las vacantes ✅ 🧪
```text
[Prompt 0-MVP]
Genera descripciones deterministas para las 100 vacantes sembradas (apps/api/src/seed/job-descriptions.ts): Sobre el rol,
Responsabilidades por familia de puesto, Requisitos derivados de las skills (nivel y obligatoriedad), Deseable, Qué ofrecemos
(salario USD, modalidad, ciudad), Sobre la empresa y Proceso de selección. La web las muestra con encabezados y viñetas
(componente JobDescription, sin HTML crudo) y un extracto de dos líneas en la lista.
```
<details><summary>Prompt original (11:37)</summary>

> Haz descripciones más detalladas de las vacantes.
</details>

### C17 · Soft skills y radares por tipo de skill ✅ 🧪
```text
[Prompt 0-MVP]
1. Soft skills opcionales en vacantes: amplía la taxonomía (Resolución de problemas, Adaptabilidad, Pensamiento crítico,
   Orientación al cliente, Gestión del tiempo, Negociación, Empatía), campo softSkills en la API y en CSV/JSON, y sección
   propia en el formulario, el detalle y la descripción («Habilidades blandas»).
2. En los radares (detalle y landing) las soft skills se muestran en verde (#34d399) en ejes, puntos y leyenda.
3. Perfil del candidato con sección propia de soft skills (ver, agregar, ajustar nivel; en verde), separada de las técnicas;
   se confirman juntas. Candidatos sembrados con más skills técnicas y soft skills (Ana 17, Luis 15; Sofía sin skills) y 4
   candidatos nuevos (Valeria, Diego, Mariana, Jorge) con postulaciones recientes.
4. En el detalle, dos radares vacante vs. candidato: skills técnicas y soft skills; un eje por skill que pide la vacante con
   el nivel confirmado del candidato; con menos de 3 ejes se completa con skills del perfil y se avisa. Tamaño final: 480 px
   en el detalle y 510 px en la landing; etiquetas largas en dos líneas.
Las soft skills solo cuentan para el score si están confirmadas (regla ética del match). MATCH_MODEL_VERSION no cambia
porque no cambian pesos ni fórmula.
```
**Entregables:** `components/SkillComparisonRadars.tsx` (+ prueba), `components/RadarSvg.tsx`, `pages/ProfilePage.tsx`,
`pages/JobDetailPage.tsx`, taxonomía y seed.

<details><summary>Prompts originales</summary>

- (11:47) «Las vacantes deben de manera opcional tener registradas soft skills. En las gráficas de radar, incluyendo el landing page, incluye habilidades en soft skill en verde que combine con los colores actuales de la gráfica de radar. […] Mejora el buscador de vacantes, que use el 90 % de la página y que sea un ícono y no un botón.» (la parte de apps móviles está en C18 y la del buscador en C13)
- (12:18) «Agrega más skills y soft skills a los candidatos.»
- (12:21) «Incrementa el tamaño de las gráficas de radar al doble en todas.» · (12:25) «Reduce el tamaño en 50 % de las gráficas de radar.»
- (12:33) «En el formulario del perfil del candidato agrega la opción para ingresar y ver soft skills. Agrega soft skills a los candidatos registrados.»
- (12:37) «Genera una gráfica de radar por skills y soft skills entre la vacante y el candidato, es decir, en una gráfica entre vacante y candidato skills y en otra entre vacante y candidato soft skills; incrementa el tamaño de las gráficas un 50 %.»
</details>

### C18 · Landing: apps móviles, leyenda y logo ✅
```text
[Prompt 0-MVP]
1. Sección «Sigue tu proceso desde el celular» antes del footer con descargas de App Store y Google Play (URLs provisionales
   en apps/web/src/site.ts; se omite en el portal del empleador). Se oculta con un ícono ✕ arriba a la derecha (preferencia
   nexo.hideApps) y se vuelve a mostrar desde el footer con «📱 NexoTalent en tu dispositivo móvil».
2. Leyenda arriba a la derecha de la landing: «NexoTalent: la primera plataforma enfocada en los candidatos TI.» (ES/EN, con
   «NexoTalent» en el diseño del logo) y un ícono animado a la derecha (sin animación con prefers-reduced-motion).
3. Logo «NexoTalent ✦» de la parte superior izquierda al triple de tamaño en la landing (55 px; ajustado en móvil).
4. make stop: detiene la API (:4000) y la web (:5173) locales.
```
**Entregables:** `components/MobileAppsSection.tsx`, `pages/LandingPage.tsx`, `components/site-chrome.test.tsx`, `Makefile`.

<details><summary>Prompts originales</summary>

- (11:47) «En la parte inferior y antes del footer provee una sección para descargar las aplicaciones móviles iOS y Android, coloca URL placeholders para las descargas, menciona que puede seguir su proceso en la aplicación móvil donde esté.»
- (12:11) «La sección relacionada con la descarga de las aplicaciones móviles debe poder ocultarse con un ícono en la parte superior derecha de la sección y debe mostrar la opción en la parte del footer.»
- (12:13) «Reemplaza Mostrar apps móviles por NexoTalent en tu dispositivo móvil.»
- (12:16) «Coloca una leyenda en la parte superior derecha del landing page que diga lo siguiente, con un ícono del lado derecho con animación: "NexoTalent, la primera plataforma enfocada en los candidatos."»
- (12:21 / 12:25) «Incrementa al triple el texto de NexoTalent en el landing, en la parte superior izquierda. Regresa el texto de NexoTalent en la leyenda como estaba anteriormente.»
- (12:46) «Modifica el texto a "NexoTalent, la primera plataforma enfocada en los candidatos TI." con diseño en NexoTalent.»
</details>

### C19 · Documentación al día con los últimos cambios ✅ 📚 M2
```text
[Prompt 0-MVP]
Lee el historial de prompts enviados desde la línea de comandos y agrega a prompts.md los que falten de la aplicación web
(versión reproducible + prompt original). Después actualiza la documentación hasta el último cambio: tasks.md y proposal de
los changes, specs delta de OpenSpec para las capacidades nuevas, tickets (docs/14), historias (docs/13), modelo de datos
(docs/06), API (docs/07), frontend (docs/08), testing (docs/10), roadmap (docs/15) y CHANGELOG. Marca como pendiente lo no
ejecutado.
```
<details><summary>Prompt original (19/11/2026)</summary>

> Actualiza el archivo de prompts con los últimos prompts que fueron enviados desde la línea de comandos y que no están en el
> archivo de prompts.md para la parte de la aplicación web, y actualiza o crea las tareas para que toda la documentación esté
> actualizada y completa hasta los últimos cambios.
</details>

### Prompts operativos (no generan código)
| Prompt (17/11/2026) | Resultado |
|---|---|
| «corre la aplicación y dime en qué url» · «corre el proyecto» · «start application» | `make start` → web http://localhost:5173, API http://localhost:4000 |
| «make stop» | Detiene API y web (objetivo agregado en C18) |
| «Dime con qué parámetro en la url puedo iniciar con un usuario existente» | `/login?demo=1` muestra las cuentas de demo; las cuentas sembradas usan la contraseña `Demo1234` |
| «Genera un markdown deployment.md con los pasos para realizar el despliegue» | ⏸️ Interrumpido por el usuario (`stop`); `deployment.md` **no existe**. Queda en C9 |

---

## Prompt 0 · Brief del proyecto (contexto reutilizable)

```text
Eres un ingeniero de software senior que trabaja en NexoTalent AI, una plataforma de reclutamiento
AI-native. Contexto obligatorio:

PRODUCTO
- Conecta vacantes y candidatos por similitud semántica de skills (LLM + embeddings + pgvector).
- Candidato: importa o construye su CV, ve un radar de skills (vacante vs. candidato), postula manual o
  con auto-apply por reglas, sigue cada postulación con un stepper, tiene calendario de entrevistas
  (Calendly + Google Calendar/ICS) y recibe notificaciones in-app, email, WhatsApp y push.
- Empleador/reclutador: paga para publicar vacantes (Stripe), importa 1..N vacantes (API, endpoint
  registrado, CSV, PDF, conectores SAP/CRM/ATS, servidores MCP), revisa candidatos por match, cambia
  estatus, agenda entrevistas con Calendly, cierra vacantes (filled | cancelled | on_hold), ve
  posiciones disponibles y número de postulantes, recibe recordatorios a 3 y 5 días de postulaciones
  sin cambio (email, Slack, Teams, push).
- Admin de plataforma: administra usuarios, organizaciones, vacantes, candidatos, planes, integraciones.

ARQUITECTURA
- Polyrepo. Contratos SOLO en nexo-specs (OpenAPI, AsyncAPI, JSON Schema, OpenSpec, docs).
- Backend: Node.js 24 LTS, TypeScript estricto, Fastify, Drizzle ORM, Zod, arquitectura hexagonal,
  microservicios por bounded context, EDA con Amazon EventBridge + SQS (outbox, consumidores
  idempotentes, CloudEvents), BFF por canal (web/móvil) con endpoints agregados por pantalla.
- Datos: Aurora PostgreSQL 16 + pgvector (esquema por servicio, RLS), Redis/Valkey, S3.
- IA: Amazon Bedrock (Claude para razonamiento/extracción, embeddings 1024-d), RAG híbrido,
  servidor MCP propio y clientes MCP externos, agentes con límites.
- Frontend: React 19 + Vite + TypeScript, TanStack Router/Query, Tailwind v4, Radix, Recharts,
  Motion; design system en nexo-ui con Storybook. Look & feel moderno AI-native (dark-first, aurora
  gradient, señales ✦ de IA, streaming).
- AWS: CloudFront, WAF, ALB, ECS Fargate, Lambda, Cognito, EventBridge, SQS, SES, SNS, Textract,
  Bedrock, Secrets Manager, KMS; IaC con AWS CDK; CI/CD con GitHub Actions + OIDC.

REGLAS DE TRABAJO
- Spec Driven Development con OpenSpec: no implementes nada que no esté en un change aprobado.
- TDD: primero la prueba que falla; muéstrame el rojo antes de implementar.
- Pirámide de pruebas: unit (Vitest) > integración (Testcontainers) > contrato (Pact) > E2E (Playwright).
- Respeta los guardrails de AGENTS.md y .claude/settings.json. Nunca leas ni edites .env ni secretos.
- Solo datos sintéticos (Faker, dominio example.com).
- Ética: la IA no rechaza ni contrata; excluye atributos protegidos; explica cada score.
- Idioma de la documentación: español (México). Código y nombres técnicos en inglés.
- Si algo es ambiguo, pregunta antes de asumir.
```

---

## Prompt R · Revisión adversarial (reutilizable) 📚 M4

```text
Actúa como revisor adversarial independiente. NO has visto cómo se produjo este trabajo y tu objetivo es
encontrar problemas, no aprobar.

Revisa: {{ruta(s) o PR}}
Contra: {{spec / documento / criterios de aceptación}}

Evalúa:
1. Cumplimiento de la spec y de cada escenario GIVEN/WHEN/THEN.
2. Ambigüedades, requisitos faltantes o contradicciones con otros documentos de nexo-specs/docs.
3. Seguridad (OWASP Top 10 y OWASP LLM Top 10), privacidad (LFPDPPP, PII en logs/prompts) y sesgo.
4. Calidad de pruebas: ¿prueban comportamiento o implementación? ¿faltan casos borde?
5. Rendimiento: N+1, llamadas secuenciales evitables, índices faltantes, payloads grandes.
6. Over-engineering o código muerto.

Entrega `review.md` con una tabla: id | severidad (BLOCKER/MAJOR/MINOR) | hallazgo | evidencia
(archivo:línea) | recomendación. Termina con un veredicto: APROBADO / CAMBIOS REQUERIDOS.
No modifiques archivos.
```

---

# FASE 0 · Workspace polyrepo y harness 📚 M1, M5, M7 · 🔁 v2 (en el MVP lo sustituye C0)

### P0.1 · Crear el workspace polyrepo 🧭
📁 `nexo-workspace`
```text
[Prompt 0]
Crea el meta-repo nexo-workspace para gestionar el polyrepo de NexoTalent AI.

Entregables:
1. repos.yaml con: nexo-specs, nexo-harness, nexo-shared-node, nexo-ui, nexo-web, nexo-admin,
   nexo-bff-web, nexo-bff-mobile, nexo-identity-svc, nexo-jobs-svc, nexo-candidates-svc,
   nexo-applications-svc, nexo-ai-svc, nexo-ingestion-svc, nexo-integrations-svc,
   nexo-scheduling-svc, nexo-notifications-svc, nexo-billing-svc, nexo-mcp-server, nexo-realtime,
   nexo-infra, nexo-evals, legacy-ats-sim, nexo-android, nexo-ios. Para cada uno: url, rama,
   tipo (service|frontend|library|infra|specs|mobile), dependencias.
2. scripts/clone-all.sh, scripts/pull-all.sh, scripts/status-all.sh, scripts/sync-harness.sh
   (copia skills/hooks/agents de nexo-harness a cada repo), scripts/new-service.sh (plantilla).
3. docker-compose.yml local: postgres con pgvector (pgvector/pgvector:pg16), valkey, localstack
   (s3, sqs, eventbridge, ses, sns, secretsmanager), mailpit, stripe-mock, wiremock (SAP/Calendly mock),
   langfuse. Healthchecks y volúmenes.
4. Makefile: up, down, seed, test-all, lint-all.
5. AGENTS.md global con el mapa de repos, cómo usar --add-dir ../nexo-specs y reglas comunes.
6. .github/workflows reutilizables: service-ci.yml, frontend-ci.yml, library-release.yml.
7. README.md del workspace.
No crees todavía el código de los servicios.
```

### P0.2 · Harness compartido 🛡️
📁 `nexo-harness`
```text
[Prompt 0]
Construye el repo nexo-harness con la configuración compartida de agentes.

1. templates/AGENTS.service.md, AGENTS.frontend.md, AGENTS.library.md, AGENTS.infra.md con: contexto,
   comandos, arquitectura, reglas (TDD, hexagonal, outbox, scope de OpenSpec, sin secretos, datos
   sintéticos), definición de terminado. Usa como base docs/12-harness-sdd-guardrails.md.
2. skills/ (cada una con SKILL.md + plantillas): new-endpoint, new-event, drizzle-migration,
   ui-component, llm-prompt, connector-adapter, write-characterization-tests.
3. agents/: adversarial-reviewer.md (contexto limpio, solo lectura), test-writer.md, spec-checker.md,
   security-reviewer.md, ai-red-team.md.
4. hooks/ en Node (.mjs), cada uno con pruebas:
   - block-dangerous.mjs: bloquea rm -rf, git push --force, cdk destroy, aws * delete*, curl|sh,
     npm publish, acceso a perfiles prod.
   - scope-guard.mjs: bloquea Edit/Write fuera de los archivos permitidos por el change activo
     (lee openspec/changes/<activo>/tasks.md), .env*, migraciones ya aplicadas, otros repos.
   - secret-scan.mjs (gitleaks sobre el diff), pii-guard.mjs (emails no example.com, teléfonos reales,
     CURP/RFC con formato válido en fixtures).
   - lint-and-test-affected.mjs (PostToolUse), dod-check.mjs (Stop).
   - Todos escriben en harness-log.jsonl {ts, hook, tool, decision, reason}.
5. settings/settings.base.json con permisos allow/deny y el registro de hooks.
6. mcp/.mcp.base.json: postgres (solo lectura a la BD local), playwright, aws-documentation, github.
7. Pruebas de los hooks con Vitest (casos permitidos y bloqueados).
8. README con cómo sincronizar a cada repo y cómo versionar el harness (v1, v2, v3).
```

### P0.3 · Inicializar OpenSpec y contratos
📁 `nexo-specs`
```text
[Prompt 0]
Inicializa nexo-specs como repositorio de contratos y especificaciones.

1. Inicializa OpenSpec (openspec init) y configúralo para el agente que uso.
2. Estructura: docs/, openspec/specs/, openspec/changes/, api/ (OpenAPI por servicio + bff),
   asyncapi/nexo-domain.yaml, schemas/ (JSON Schema: canonical-job, cloudevent-envelope, eventos),
   prompts/ (prompts versionados de IA), adr/, runbooks/, reviews/.
3. Scripts: validate (openspec validate --strict, spectral lint para OpenAPI, asyncapi validate,
   ajv para schemas), generate-types (openapi-typescript + json-schema-to-typescript) publicando el
   paquete @nexo/contracts en GitHub Packages.
4. CI: valida todo en cada PR; publica @nexo/contracts en tag.
5. project.md de OpenSpec con el contexto del Prompt 0 y convenciones.
```

---

# FASE 1 · Diseño y documentación 📚 M2, M4, M9, M10 · ✅ ejecutada (1.ª entrega; costuras cerradas en C1)

> Todos los documentos se generan en `nexo-specs/docs/`. Genera uno por sesión, revísalo con el Prompt R y corrige antes de pasar al siguiente: cada documento es contexto para los siguientes.

### P1.1 · Visión del producto 🛡️
```text
[Prompt 0]
Genera docs/01-vision-producto.md en español con:
1. Problema por actor (candidato, reclutador, empresa con SAP, admin) en tabla.
2. Propuesta de valor (match explicable, cero ghosting 3/5 días, ingesta universal 1..N con
   sincronización bidireccional, auto-apply responsable, CV inteligente, omnicanal).
3. 4 personas con objetivo principal.
4. Roles RBAC: candidate, recruiter, employer_admin, platform_admin, integration.
5. Funcionalidades por portal (candidato, empleador, admin) incluyendo: radar de skills, stepper,
   dashboard de postulaciones, calendario Calendly + Google Calendar/ICS, importación CSV/PDF/API/
   endpoint/conectores/MCP, cierre de vacantes filled/cancelled/on_hold, posiciones disponibles y
   número de postulantes por vacante, pagos.
6. Máquinas de estado de vacante y postulación.
7. Modelo de negocio con cobro con tarjeta (Stripe): pay-per-post, packs, suscripciones Pro/Business/
   Enterprise, add-ons; precios sugeridos en MXN; reglas de consumo de créditos en importaciones masivas.
8. Benchmark: funcionalidades de bolsas de trabajo (LinkedIn, Indeed, OCC, Computrabajo) y ATS
   (Greenhouse, Lever, Workable, Ashby) y cómo NexoTalent las iguala o mejora, con fase (MVP/1/2/3).
9. Métricas: North Star y de soporte, incluyendo precision@10 y ratio de impacto adverso.
Formato: tablas y listas, sin relleno.
```

### P1.2 · Arquitectura del sistema 🧭 🛡️
```text
[Prompt 0]
Lee docs/01-vision-producto.md. Genera docs/02-arquitectura.md con:
1. Estilo: microservicios por bounded context, EDA (EventBridge + SQS + DLQ + outbox), BFF por canal,
   hexagonal + capa anticorrupción para integraciones. Justifica cada uno.
2. Diagrama de contexto C4 nivel 1 y de contenedores nivel 2 en Mermaid (clientes web/admin/Android/
   iOS, CloudFront, BFFs, realtime WebSocket, Cognito, 10 microservicios, MCP server, EventBridge,
   SQS, Aurora+pgvector, Redis, S3, Bedrock, Textract, Scheduler).
3. Tabla de servicios: responsabilidad, eventos que publica y consume.
4. Sección "Optimización de llamadas del backend": endpoints agregados por pantalla, Promise.all,
   undici keep-alive, DataLoader, CQRS read models, Redis stale-while-revalidate con invalidación por
   evento, ETag/304, paginación keyset, selección de campos, Brotli/HTTP2, WebSocket/SSE en vez de
   polling, contadores desnormalizados, batch de embeddings y prompt caching, HNSW.
5. Estructura polyrepo y cómo se coordinan cambios entre repos.
6. ADRs resumidos (polyrepo, EventBridge, pgvector, Bedrock, Fastify, Fargate, outbox, Drizzle, BFF).
7. Beneficios, sacrificios y mitigación para el MVP (despliegue modular).
Verifica que los diagramas Mermaid sean sintácticamente válidos.
```

### P1.3 · Arquitectura de IA 🛡️
```text
[Prompt 0]
Lee docs/01 y 02. Genera docs/03-arquitectura-ai.md con:
1. AI Plane (diagrama Mermaid): LLM gateway (routing por modelo, structured outputs con JSON Schema +
   Zod, prompt caching, semantic cache, PII redaction, cuotas, prompts versionados), embeddings,
   matching, RAG, extractores, agentes, Langfuse.
2. Extracción de skills de CV (PDF/DOCX/escaneado con Textract) y de vacantes (PDF con N vacantes:
   segmentación + extracción con confianza), normalización contra taxonomía (ESCO/O*NET) por embeddings,
   human-in-the-loop.
3. Mejora de CV: modo importación y modo guiado (wizard 5 pasos), sin inventar experiencia.
4. Fórmula de matching híbrido con pesos, pre-filtro SQL + ANN + re-ranking, atributos protegidos
   excluidos, caché e invalidación.
5. Cálculo de datos para la gráfica de radar (6–8 ejes por categoría, required vs candidate 0-5,
   strengths, gaps).
6. RAG: casos (copiloto reclutador, asistente candidato, soporte admin), chunking, búsqueda híbrida
   BM25 + vector con RRF, rerank, citas obligatorias, aislamiento multi-tenant con RLS.
7. MCP: servidor propio (tools y resources con roles) y clientes MCP de proveedores de vacantes.
8. Agentes: auto-apply, screening, copiloto, import; herramientas y límites.
9. Guardrails de IA del producto y defensa contra prompt injection en documentos.
10. Tabla de evals con dataset, métrica y umbral de CI.
```

### P1.4 · Integraciones 🛡️
```text
[Prompt 0]
Lee docs/02 y 03. Genera docs/04-integraciones.md con:
1. Modelo canónico CanonicalJob (JSON) y regla de unicidad (organization_id, source_type, external_id).
2. Canales de ingesta 1..N con diagrama: API push (Idempotency-Key, 1..1000), endpoint registrado
   con pull programado y mapeo JSONPath, webhook entrante HMAC, CSV con URL prefirmada y validación por
   fila, PDF con Textract + LLM, formulario con asistente. Estados de la importación y cobro de créditos.
3. Conectores empresariales con puertos JobSourcePort/StatusSinkPort y adaptadores: SAP
   SuccessFactors (OData), Workday, Salesforce (CDC), HubSpot, Dynamics 365, Greenhouse/Lever,
   REST genérico, cliente MCP genérico. Sincronización bidireccional de estatus con tabla de mapeo,
   credenciales en Secrets Manager, resiliencia (retry, circuit breaker, DLQ), idempotencia.
4. Registro de servidores MCP de proveedores de vacantes y mapeo de tools.
5. Calendly: OAuth del reclutador, scheduling links de un solo uso, webhooks invitee.created/canceled,
   correlación con la postulación, diagrama de secuencia. Calendario del candidato: vista en la app,
   sincronización con Google Calendar (OAuth) y feed ICS. Cambios automáticos de estatus.
6. Stripe: Checkout, Payment Intents con 3DS, webhooks idempotentes, ledger de créditos, PCI SAQ A,
   facturación CFDI en fase 2.
```

### P1.5 · Eventos y notificaciones 🛡️
```text
[Prompt 0]
Genera docs/05-eventos-notificaciones.md con:
1. Envelope CloudEvents 1.0 con extensión nexo (tenantId, correlationId, causationId, actor); reglas
   (inmutables, versionados, sin PII, idempotencia, FIFO por subject donde importe).
2. Catálogo de eventos (productor y consumidores).
3. Detección de postulaciones estancadas a 3 y 5 días: barrido horario con EventBridge Scheduler,
   stale_level idempotente, reinicio al cambiar estatus, escalamiento al día 5, acciones rápidas
   (cambiar estatus, mensaje dentro de la postulación, email) también desde Slack/Teams. Diagrama.
4. Arquitectura de notificaciones omnicanal (rules engine, preferencias, quiet hours, dedupe, colas por
   canal): in-app WebSocket, SES, WhatsApp Cloud API, SNS (FCM/APNs), Slack, Teams. Diagrama.
5. Matriz canal × audiencia y tabla de notificación por cada paso del proceso para candidato y
   empleador.
6. Detalles: plantillas MJML e i18n, reglas de WhatsApp (opt-in, plantillas aprobadas), registro de
   tokens push, apps de Slack/Teams, bitácora de estados.
```

### P1.6 · Modelo de datos 🛡️ 📚 M10
```text
[Prompt 0]
Lee docs/01–05. Genera docs/06-modelo-datos.md con:
1. Convenciones: Aurora PostgreSQL 16 + pgvector, esquema por servicio, FK solo dentro del esquema,
   ULID, timestamps, organization_id + RLS.
2. Diagrama erDiagram de Mermaid con TODAS las entidades (organization, user, membership, job,
   skill, job_skill, candidate, candidate_skill, resume, application, application_status_history,
   application_message, interview, auto_apply_rule, match_score, import_batch, import_item,
   integration_connection, plan, subscription, credit_ledger, payment, notification,
   notification_preference, device), con tipo, PK, FK, UK y comentario de restricciones en cada
   atributo, y cardinalidades.
3. Descripción detallada de las entidades principales (tabla atributo | tipo | restricciones |
   descripción), índices (B-tree parciales, GIN tsvector, HNSW) y reglas (UNIQUE job+candidate,
   positions_filled ≤ positions_total, ledger append-only).
4. Consulta ejemplo de matching con filtros + ANN y parámetros de pgvector (ef_search, iterative_scan).
Valida que el erDiagram renderice.
```

### P1.7 · API y contratos 🛡️
📁 `nexo-specs`
```text
[Prompt 0]
1. Genera docs/07-api.md: convenciones (versionado, JWT/API key, RFC 9457, cursor, Idempotency-Key,
   ETag, correlation id), catálogo completo de endpoints del BFF (candidato, empleador, admin,
   webhooks) y OpenAPI 3.1 de los 3 endpoints principales: POST /v1/jobs/imports,
   GET /v1/jobs/{jobId}/match, PATCH /v1/applications/{id}/status (con If-Match), con ejemplos de
   petición/respuesta y códigos de error.
2. Genera los archivos reales api/bff-web.openapi.yaml y api/<servicio>.openapi.yaml para jobs,
   applications, ai, ingestion, candidates, scheduling, billing, identity, notifications con todos los
   endpoints del catálogo.
3. Genera asyncapi/nexo-domain.yaml con todos los eventos de docs/05 y schemas/*.json.
4. Ejecuta las validaciones (spectral, asyncapi, ajv) y corrige hasta que pasen.
```

### P1.8 · Frontend y UX 🛡️ 📚 M12
```text
[Prompt 0]
Usa la skill frontend-design si está disponible. Genera docs/08-frontend-ux.md con:
1. Stack: React 19, Vite, TS, TanStack Router/Query, Zustand, Tailwind v4, Radix, Recharts, Motion,
   RHF + Zod, i18next, Vitest, Storybook, Playwright.
2. Dirección visual moderna "AI-native": dark-first con modo claro, aurora gradient, glass solo en
   destacados, tipografía Geist, señales de IA consistentes (✦, borde gradiente animado, shimmer,
   streaming, chip "Generado por IA"), command palette ⌘K, micro-interacciones, WCAG 2.2 AA.
3. Tokens CSS (colores, radios, sombras, gradiente IA).
4. Catálogo de componentes nexo-ui: SkillRadarChart (vacante vs. candidato y comparación de hasta 3
   candidatos), MatchScoreRing, ApplicationStepper, JobCard (posiciones disponibles y postulantes),
   KanbanBoard con badges 3/5 días, AIStreamText, FileDropzone, ImportPreviewTable, CalendarView,
   KPIStatCard, FunnelChart, DataTable, NotificationCenter.
5. Pantallas por portal (candidato, empleador, admin) incluyendo dashboard de postulaciones,
   mejorar CV, auto-apply, importar vacantes, cerrar vacante, integraciones, facturación, copiloto.
6. Presupuesto de rendimiento (LCP, INP, CLS, JS inicial) y técnicas.
```

### P1.9 · Seguridad, privacidad y ética 🛡️ 📚 M9
```text
[Prompt 0]
Genera docs/09-seguridad-privacidad-etica.md con:
1. Tabla de controles de seguridad: identidad (Cognito, MFA), RBAC/ABAC + RLS, API (validación,
   rate limit), webhooks firmados, archivos (presigned, magic bytes, antivirus, KMS), secretos, red
   (VPC privada, endpoints, WAF), dependencias y supply chain (SBOM, OIDC), logs sin PII, OWASP Top 10
   y OWASP Top 10 para LLM. Con ejemplos de código cortos.
2. Privacidad en México según la Ley Federal de Protección de Datos Personales en Posesión de los
   Particulares vigente: aviso de privacidad, finalidades, ARCO (exportar/borrar incluyendo embeddings),
   transferencias al postular y a conectores, no recabar datos sensibles.
3. Si se opera en la UE: GDPR (art. 22) y AI Act (reclutamiento como alto riesgo). Menciona la ley
   local 144 de NYC como referencia de auditoría de sesgo.
4. Principios éticos implementados: supervisión humana, explicabilidad, no discriminación (evals
   contrafactuales y regla 4/5), transparencia, consentimiento, minimización, agencia limitada,
   rendición de cuentas (ai_audit_log), no biometría.
Verifica referencias normativas con búsqueda web antes de afirmarlas y cita las fuentes al final.
```

### P1.10 · Estrategia de testing 🛡️ 📚 M11
```text
[Prompt 0]
Genera docs/10-estrategia-testing.md con: pirámide (Mermaid) y porcentajes, ciclo TDD con un ejemplo
en Vitest del caso de uso ChangeApplicationStatus (transición inválida y outbox), matriz de pruebas
por servicio (unit, integración con Testcontainers/LocalStack/WireMock/stripe-mock, contrato Pact y
AsyncAPI), pruebas de frontend y design system (Vitest, Storybook interaction + a11y, Playwright
visual, MSW), 7 flujos E2E críticos, pruebas no funcionales (k6, resiliencia, ZAP) y quality gates
de CI (cobertura de dominio ≥ 80 %, mutation testing, evals).
```

### P1.11 · Infraestructura AWS 🛡️
```text
[Prompt 0]
Genera docs/11-infraestructura-aws.md con: diagrama Mermaid (Route 53, CloudFront+WAF, S3 web, ALB,
ECS Fargate, Lambda, Aurora Serverless v2 con pgvector, ElastiCache Valkey, VPC endpoints,
EventBridge+Scheduler, SQS+DLQ, Cognito, Bedrock, Textract, SES, SNS, Secrets Manager, KMS, API
Gateway WebSocket, CloudWatch/X-Ray), entornos (dev, preview por PR, staging, prod) y cuentas,
estructura de nexo-infra en CDK TypeScript con el construct NexoService, pipeline CI/CD (Mermaid)
con OIDC, migraciones expand/contract, canary blue/green con rollback por alarmas, observabilidad
(OTel, Langfuse, dashboards, alarmas), estimación de costos y DR (RPO/RTO).
```

### P1.12 · Harness, SDD y guardrails 📚 M1–M8
```text
[Prompt 0]
Genera docs/12-harness-sdd-guardrails.md documentando cómo se construye el producto con agentes:
estructura de harness por repo, plantilla AGENTS.md, skills compartidas, MCP del agente; flujo SDD con
OpenSpec (Mermaid) y capacidades; documentación as code y subagente adversarial-reviewer con formato
de hallazgos; settings.json con permisos y hooks y tabla de qué bloquea cada hook y harness-log.jsonl;
trabajo polyrepo con agentes (repos.yaml, --add-dir, orquestación de changes cross-repo, versionado,
Pact); evals del harness (20 tareas, tipos, métricas, comparación v1/v2/v3); AI for Legacy con el
ATS legacy simulado (docs, tests de caracterización, ACL, strangler).
```

### P1.13 · Historias de usuario 🛡️
```text
[Prompt 0]
Genera docs/13-historias-usuario.md con: backlog priorizado de al menos 15 historias (épica, MoSCoW,
puntos Fibonacci) cubriendo radar, stepper, importación CSV/PDF, importar CV, constructor de CV,
auto-apply, pagos, recordatorios 3/5 días, Calendly, Google Calendar, cerrar vacante, preferencias de
notificación, conector SAP, admin y copiloto. Detalla al menos 5 historias en formato
"Como… quiero… para…" con criterios Gherkin en español (casos felices, de error y de accesibilidad),
notas técnicas, prioridad y puntos. Cumplen INVEST.
```

### P1.14 · Tickets de trabajo 🛡️
```text
[Prompt 0]
Genera docs/14-tickets-trabajo.md con 3 tickets completos listos para desarrollar de inicio a fin:
- TK-BE: endpoint de match con datos de radar (ai-svc + BFF), con caché, ETag e invalidación por eventos.
- TK-FE: SkillRadarChart y ApplicationStepper en nexo-ui e integración en nexo-web.
- TK-DB: esquema de matching con pgvector, HNSW, GIN, RLS y seeds sintéticos.
Cada ticket: tabla de metadatos (repo, historia, change OpenSpec, estimación, etiquetas), contexto,
alcance, especificación técnica, criterios de aceptación como checklist medible, pruebas por nivel,
definición de terminado y dependencias.
```

### P1.15 · Roadmap
```text
[Prompt 0]
Genera docs/15-roadmap.md con fases (0 fundaciones, 1 MVP web, 1.5 omnicanal, 2 móvil, 3 enterprise),
plan de 8 semanas para el proyecto final con evidencia esperada por semana para el curso y tabla de
riesgos con mitigación. Genera docs/README.md como índice de todos los documentos.
```

### P1.16 · Revisión adversarial de toda la documentación 🛡️ 📚 M4
```text
[Prompt R] aplicado a nexo-specs/docs/*.md.
Adicionalmente verifica consistencia cruzada: nombres de estados, eventos, endpoints, entidades y
servicios deben coincidir entre todos los documentos y los contratos (api/, asyncapi/, schemas/).
Lista cada inconsistencia con ambos lugares donde aparece.
```

### P1.17 · README de entrega del curso
```text
[Prompt 0]
Lee la plantilla readme.md del curso y todos los documentos de nexo-specs/docs. Genera
readme-updated.md llenando las secciones 0 a 6 (OMITE la sección 7 de Pull Requests y quítala del
índice):
0. Ficha (deja marcadores para nombre, URLs y repositorio).
1. Objetivo, funcionalidades, diseño y UX (recorrido por pantallas con marcadores de capturas/video),
   instalación local paso a paso (requisitos, clonado polyrepo, docker compose, variables, migraciones,
   seeds, arranque de servicios y frontends, cuentas de prueba).
2. Arquitectura (diagrama Mermaid, patrón, justificación, beneficios y sacrificios), componentes,
   estructura de ficheros, infraestructura y despliegue, seguridad con ejemplos, tests.
3. Modelo de datos (erDiagram completo) y descripción de entidades.
4. Máximo 3 endpoints en OpenAPI con ejemplos.
5. 3 historias de usuario.
6. 3 tickets (backend, frontend, base de datos).
Enlaza a docs/ para el detalle. No inventes URLs reales.
```

---

# FASE 2 · Especificaciones OpenSpec 📚 M2, M3 · 🔁 v2 (núcleo cubierto por C1)

### P2.1 · Specs por capacidad 🧭 🛡️
📁 `nexo-specs`
```text
[Prompt 0]
A partir de docs/01–14 crea las specs base en openspec/specs/ para las capacidades: identity-access,
job-management (incluye pago, posiciones, cierre filled/cancelled/on_hold), job-ingestion (API,
endpoint, CSV, PDF, 1..N, créditos), resume-intelligence (importar CV, extraer skills, mejorar CV,
wizard), matching (score, radar, explicación), applications-pipeline (postulación, estados, stepper,
mensajes), auto-apply, stale-reminders (3/5 días), scheduling (Calendly, Google Calendar, ICS),
notifications (canales y preferencias), billing, integrations (conectores y MCP), mcp-server,
admin, copilot-rag.
Cada requisito con lenguaje SHALL/MUST y escenarios GIVEN/WHEN/THEN derivados de las historias.
Ejecuta openspec validate --strict.
```

### P2.2 · Change proposals del MVP 🛡️
```text
[Prompt 0]
Crea los change proposals en openspec/changes/ en este orden (uno por carpeta con proposal.md,
design.md, tasks.md y spec deltas):
1. bootstrap-platform (shared-node, identity, BFF skeleton)
2. add-job-management-and-billing
3. add-job-ingestion-csv-pdf-api
4. add-resume-intelligence
5. add-vector-matching-schema
6. add-job-match-radar
7. add-applications-pipeline
8. add-radar-and-stepper-components
9. add-stale-reminders-and-notifications
10. add-calendly-scheduling
11. add-admin-panel
12. add-auto-apply
13. add-integrations-and-mcp
En tasks.md agrupa tareas por repo con el prefijo [repo] y marca dependencias entre changes.
Pásale el Prompt R a cada proposal antes de aprobarla.
```

---

# FASE 3 · Desarrollo backend (Node.js) 📚 M10, M11 · 🔁 v2 (núcleo cubierto por C2–C5)

> Para cada prompt: inicia en el repo indicado con `--add-dir ../nexo-specs`, activa el change correspondiente y aplica TDD 🧪. Al terminar: `Prompt R` → corrige → archiva el change en OpenSpec cuando todas sus tareas estén completas.

### P3.1 · Librería compartida 🧪
📁 `nexo-shared-node`
```text
[Prompt 0]
Implementa @nexo/shared-node (TypeScript, ESM, build con tsup) con TDD:
- logger pino con redact de PII y correlationId (AsyncLocalStorage).
- OpenTelemetry bootstrap (HTTP, undici, pg, aws-sdk).
- errores de dominio y mapeo a RFC 9457 para Fastify.
- plugin Fastify de auth: verifica JWT de Cognito (jose, JWKS en caché), extrae roles y tenant,
  helpers requireRole/requireTenant.
- outbox: tabla, repositorio Drizzle, relay worker que publica a EventBridge en lotes de 10 con
  reintentos, y helper withOutbox(tx, event).
- consumidor SQS genérico: valida CloudEvent contra JSON Schema de @nexo/contracts, idempotencia
  (processed_events), visibility timeout, DLQ.
- cliente HTTP interno undici con keep-alive, timeouts, retries y circuit breaker.
- helpers de paginación por cursor, ETag y Idempotency-Key (Redis).
- test utils: factories con Faker (dominio example.com) y Testcontainers presets.
Cobertura ≥ 85 %. Publica como paquete en GitHub Packages.
```

### P3.2 · Plantilla de microservicio
📁 `nexo-workspace` (scripts/new-service.sh)
```text
[Prompt 0]
Crea la plantilla de servicio que usa scripts/new-service.sh:
src/domain, src/application (casos de uso), src/infra (http, db, messaging, clients), src/main.ts;
Fastify con schemas generados desde @nexo/contracts; Drizzle con esquema propio y migraciones;
health/readiness; Dockerfile multi-stage distroless (node 24) con usuario no root; vitest config
(unit/int/contract); Pact provider verification; AGENTS.md desde nexo-harness; .claude/ sincronizado;
workflow que llama al service-ci.yml reutilizable. Genera un servicio de ejemplo y verifica que pase CI
localmente.
```

### P3.3 · identity-svc 🧪 🛡️
📁 `nexo-identity-svc` · change `bootstrap-platform`
```text
[Prompt 0]
Implementa identity-svc: organizaciones, usuarios (sincronizados desde Cognito por post-confirmation
trigger), membresías con roles recruiter/employer_admin, platform_admin, invitaciones por email,
API keys para integraciones (hash argon2, prefijo visible, scopes, rotación), endpoints de perfil y
administración (/v1/admin/users, /v1/admin/organizations con filtros, paginación, suspensión).
Eventos: user.registered, org.created, member.invited (vía outbox). TDD y RLS por organización.
```

### P3.4 · jobs-svc + billing-svc 🧪 🛡️
📁 `nexo-jobs-svc`, `nexo-billing-svc` · change `add-job-management-and-billing`
```text
[Prompt 0]
jobs-svc:
- CRUD de vacantes con skills requeridas (nivel, peso, must_have).
- Máquina de estados draft → pending_payment → published ⇄ on_hold → filled | cancelled | expired,
  con close_reason obligatorio y congelamiento de vigencia en on_hold.
- POST /v1/jobs/{id}/close {status, reason, messageToApplicants}.
- Contadores positions_total, positions_filled (al consumir application.status_changed a hired) y
  applicants_count (application.submitted / withdrawn), con idempotencia.
- Expiración automática por Scheduler.
- Read model para listados públicos con ETag y caché.
billing-svc:
- Planes (seed de docs/01 §7), Stripe Checkout (one-time y suscripción), Customer Portal,
  webhooks firmados e idempotentes, credit_ledger append-only, saldo por vista materializada,
  reserva/consumo de créditos al recibir job.publish_requested y publicación de payment.succeeded.
Pruebas con stripe-mock y Testcontainers. Escenarios de la spec job-management y billing como tests.
```

### P3.5 · ingestion-svc 🧪 🛡️
📁 `nexo-ingestion-svc` · change `add-job-ingestion-csv-pdf-api`
```text
[Prompt 0]
Implementa ingestion-svc según docs/04 §2:
- POST /v1/jobs/imports (JSON 1..1000 con Idempotency-Key) y flujo de archivos: POST /v1/uploads
  (URL prefirmada S3), luego POST /v1/jobs/imports {fileType, s3Key}.
- CSV: parser streaming (csv-parse), validación Zod por fila, reporte de errores descargable,
  plantilla descargable.
- PDF: texto nativo con pdf-parse y Textract para escaneados (async); llamada a ai-svc
  (/internal/v1/extract/jobs) que segmenta N vacantes con confianza; < 0.8 → needs_review.
- Endpoint registrado: CRUD de fuentes (URL, auth en Secrets Manager, formato JSON/XML/RSS, mapeo
  JSONPath, cron), worker de pull con hash para detectar cambios.
- Webhook entrante /v1/hooks/{connectionId} con HMAC.
- Preview editable (GET/PATCH items), confirmación con cálculo de créditos y llamada a billing.
- Upsert por (organization_id, source_type, external_id). Eventos import.*.
Pruebas: CSV de 10k filas (rendimiento), PDF multi-vacante con LLM mockeado, idempotencia.
```

### P3.6 · candidates-svc 🧪
📁 `nexo-candidates-svc` · change `add-resume-intelligence`
```text
[Prompt 0]
Implementa candidates-svc: perfil del candidato, preferencias (modalidad, ubicación, salario),
subida de CV (presigned, validación magic bytes, antivirus vía evento), skills declaradas/extraídas/
confirmadas con nivel, consumo de ai.resume_parsed para proponer skills, confirmación por el
candidato, cálculo de profile_completeness (sin foto), exportación ARCO (JSON) y borrado de cuenta
(propaga candidate.deleted para borrar embeddings y chunks), y CRUD admin /v1/admin/candidates.
Endpoints del wizard de CV: guardar borrador por paso, generar PDF ATS-friendly (react-pdf o
pdfmake) y subirlo como resume primario.
```

### P3.7 · ai-svc 🧭 🧪 🛡️
📁 `nexo-ai-svc` · changes `add-resume-intelligence`, `add-vector-matching-schema`, `add-job-match-radar`
```text
[Prompt 0]
Implementa ai-svc según docs/03:
1. LLM gateway sobre Amazon Bedrock (Converse API del AWS SDK v3): routing por feature a modelo
   ligero o de razonamiento, tool use con JSON Schema + validación Zod y 1 reintento, prompt caching,
   semantic cache Redis, PII redaction (regex + NER) con reinyección, cuotas por organización,
   prompts versionados leídos de @nexo/contracts/prompts, trazas en Langfuse, métricas de tokens/costo.
2. Embeddings en batch (1024-d) con cola SQS; recalcula al recibir job.published, job.updated,
   candidate.profile_updated.
3. Extractores: CV → estructura + skills con nivel y evidencia; vacantes (texto y PDF multi-vacante con
   split_jobs); normalización contra la taxonomía por vecino más cercano (umbral 0.85).
4. Mejora de CV: endpoint con streaming SSE de sugerencias por bloque, marcadas como propuesta.
5. Matching: fórmula híbrida, pre-filtro SQL + HNSW top 200 + re-ranking, radar por categorías,
   strengths/gaps/explicación, persistencia en match_score, caché e invalidación, ETag (ticket TK-BE-012).
6. Búsqueda semántica de vacantes para el candidato y de candidatos para la vacante.
7. Migraciones del ticket TK-DB-007 (pgvector, HNSW, GIN, RLS, seeds sintéticos con embeddings).
8. Atributos protegidos nunca entran al modelo (test explícito).
TDD en la fórmula y el radar; integración con pgvector real; Bedrock mockeado en unit/integración y un
smoke test opcional contra Bedrock real con flag.
```

### P3.8 · applications-svc 🧪 🛡️
📁 `nexo-applications-svc` · changes `add-applications-pipeline`, `add-stale-reminders-and-notifications`, `add-auto-apply`
```text
[Prompt 0]
Implementa applications-svc:
- Postulación (UNIQUE job+candidate), validación de vacante published, match_score inicial desde ai-svc.
- Máquina de estados de la postulación con transiciones válidas, historial, concurrencia optimista
  (If-Match/version), regla: solo humanos pasan a rejected o hired.
- Mensajes dentro de la postulación (candidato ↔ reclutador).
- Read models: dashboard del candidato (postulaciones + paso del stepper + próxima entrevista) y
  pipeline por vacante para el empleador (kanban y estancadas).
- Stale sweep horario (Lambda o tarea programada) con stale_level 3/5 idempotente y umbrales por
  organización; publica application.stale.
- Consumo de job.status_changed: al cerrar o pausar vacante, actualiza postulaciones activas y notifica.
- Consumo de interview.scheduled/canceled → transición automática.
- Auto-apply: al consumir job.published evalúa reglas activas de candidatos (consentimiento vigente,
  min_match, filtros, daily_cap, organizaciones excluidas), postula con canal auto_apply, genera nota
  de presentación vía ai-svc y registra bitácora; kill switch global por feature flag.
TDD con reloj inyectado para el sweep (casos 2, 3, 4, 5 y 6 días).
```

### P3.9 · scheduling-svc 🧪
📁 `nexo-scheduling-svc` · change `add-calendly-scheduling`
```text
[Prompt 0]
Implementa scheduling-svc según docs/04 §5: OAuth de Calendly para reclutadores (tokens en Secrets
Manager con refresh), selección de event type, POST /v1/applications/{id}/interviews/scheduling-link
(scheduling link de un solo uso con nombre/email precargados y parámetro de tracking con applicationId),
suscripción y verificación de webhooks invitee.created/invitee.canceled, creación de interview y
eventos interview.*, Google Calendar OAuth del candidato para insertar/actualizar/cancelar eventos,
feed ICS por token (ics library), recordatorios 24 h y 1 h vía Scheduler. Pruebas con WireMock
simulando la API de Calendly y Google.
```

### P3.10 · notifications-svc + realtime 🧪 🛡️
📁 `nexo-notifications-svc`, `nexo-realtime` · change `add-stale-reminders-and-notifications`
```text
[Prompt 0]
notifications-svc según docs/05 §4:
- Rules engine (evento → plantilla → audiencia), preferencias por usuario y evento, quiet hours por
  zona horaria, dedupe y rate limit en Redis, colas SQS por canal.
- Canales: in-app (publica a nexo-realtime), email SES con plantillas MJML i18n, WhatsApp Cloud API
  con plantillas aprobadas y opt-in/opt-out, push vía SNS (FCM/APNs) con registro de dispositivos
  POST /v1/devices y purga de tokens inválidos, Slack (OAuth por organización, Block Kit con botones
  interactivos firmados), Microsoft Teams (Adaptive Cards por webhook/bot).
- Acciones rápidas desde Slack/Teams/email (enlace firmado de un solo uso) para cambiar estatus o
  escribir al candidato.
- Bitácora de notificaciones con estados.
nexo-realtime: API Gateway WebSocket + Lambda (connect con JWT, disconnect, broadcast por usuario
con tabla de conexiones en DynamoDB o Redis).
Pruebas: matriz de la tabla de docs/05 §4.2 como tests parametrizados; SES/SNS en LocalStack.
```

### P3.11 · integrations-svc + legacy 🧭 🧪 🛡️ 📚 M6
📁 `nexo-integrations-svc`, `legacy-ats-sim` · change `add-integrations-and-mcp`
```text
[Prompt 0]
1. En legacy-ats-sim crea un ATS legacy simulado: servicio SOAP (WSDL) en Node con XML, exportación
   CSV Latin-1, fechas DD/MM/YY y estatus numéricos (1..9). Documenta como si fuera código heredado.
2. En integrations-svc, antes de escribir el adaptador del legacy: genera documentation/legacy-ats.md
   analizando el WSDL y muestras, y escribe tests de caracterización del comportamiento actual.
3. Implementa los puertos JobSourcePort y StatusSinkPort, el connector registry y adaptadores:
   legacy-ats (SOAP), REST genérico con mapeo JSONPath, SAP SuccessFactors (OData v2 JobRequisition/
   JobApplication), Salesforce (REST + CDC), HubSpot (custom objects + webhooks) y cliente MCP genérico
   (usa el SDK oficial de MCP para TypeScript: tools/list, validación de tools requeridas, mapeo a
   CanonicalJob).
4. Sincronización bidireccional: consume application.status_changed y job.status_changed y empuja
   el estatus mapeado; retries con backoff+jitter, circuit breaker (opossum), DLQ, reproceso.
5. Endpoints de administración de conexiones y health.
SAP y Salesforce se prueban contra mocks WireMock con contratos de ejemplo.
```

### P3.12 · nexo-mcp-server 🧪 🛡️
📁 `nexo-mcp-server`
```text
[Prompt 0]
Implementa el servidor MCP de NexoTalent con el SDK oficial de TypeScript y transporte Streamable HTTP
con OAuth 2.1 (Cognito como authorization server). Tools: search_jobs, get_job_match, apply_to_job
(requiere consentimiento), list_applications, update_application_status, create_job, import_jobs,
close_job, schedule_interview; resources job://{id} y candidate-profile://me. Cada tool valida input con
Zod, verifica rol y tenant, llama al BFF/servicios internos y registra en ai_audit_log. Prueba con el
MCP Inspector y tests automatizados de cada tool (permitido / denegado por rol).
```

### P3.13 · BFFs optimizados 🧪 🛡️
📁 `nexo-bff-web`, `nexo-bff-mobile`
```text
[Prompt 0]
Implementa los BFF con Fastify según docs/02 §5:
- Endpoints agregados: GET /v1/bff/candidate/dashboard, GET /v1/bff/employer/dashboard,
  GET /v1/bff/jobs/{id}/detail (vacante + match + estado de postulación en 1 llamada),
  GET /v1/bff/jobs/{id}/pipeline, más los proxies del catálogo de docs/07.
- Llamadas en paralelo con Promise.all, undici pool con keep-alive, timeouts por dependencia y
  degradación elegante (si ai-svc falla, responde sin match y con flag).
- DataLoader por request, caché Redis stale-while-revalidate con invalidación por eventos, ETag/304,
  selección de campos, compresión, paginación por cursor.
- nexo-bff-mobile: payloads reducidos, endpoints de registro de dispositivos y deep links.
- Pact consumer tests contra cada servicio; prueba de carga k6 del dashboard (p95 < 300 ms a 200 RPS).
Documenta en el README del repo la cantidad de llamadas por pantalla antes/después.
```

---

# FASE 4 · Frontend (React) 📚 M12 · 🔁 v2 (núcleo cubierto por C6–C7)

### P4.1 · Design system: fundamentos 🧪 🛡️
📁 `nexo-ui`
```text
[Prompt 0]
Usa la skill frontend-design si está disponible. Crea @nexo/ui (React 19, TS, Vite library mode,
Tailwind v4) según docs/08:
- Tokens (CSS variables) dark/light, tipografía Geist, radios, sombras, gradiente IA; ThemeProvider.
- Primitivos sobre Radix: Button, Input, Select, Dialog, Sheet, Tabs, Tooltip, Toast, DropdownMenu,
  Command (⌘K), Badge, Avatar, Card, Skeleton, Progress, Switch, Slider.
- Señales IA: AIBadge, AIShimmer, AIStreamText (SSE), AIGlowBorder.
- Storybook 9 con addon a11y, interaction tests (Vitest), docs MDX y toggle de tema.
- Playwright visual sobre Storybook (dark/light × desktop/móvil).
- Release con changesets a GitHub Packages.
Cada componente: story, interaction test, 0 violaciones axe serias.
```

### P4.2 · Componentes de dominio 🧪 🛡️
📁 `nexo-ui` · ticket TK-FE-021
```text
[Prompt 0]
Implementa el ticket docs/14 TK-FE-021 y además: MatchScoreRing, JobCard (positionsAvailable de
positionsTotal, applicantsCount, score), KanbanBoard con dnd-kit y badges de estancamiento 3/5 días,
FileDropzone con progreso a S3, ImportPreviewTable virtualizada y editable con errores por celda y
confianza, CalendarView (mes/semana/agenda), KPIStatCard, FunnelChart, TrendArea, DataTable
(TanStack Table) y NotificationCenter. Charts con Recharts cargado lazy y tabla alternativa accesible.
```

### P4.3 · nexo-web: base y portal candidato 🧭 🧪
📁 `nexo-web`
```text
[Prompt 0]
Crea nexo-web (React 19 + Vite + TanStack Router/Query + @nexo/ui) con:
- Auth con Cognito (Amplify Auth o oidc-client-ts), rutas protegidas por rol, áreas /c (candidato)
  y /e (empleador), code splitting por área.
- Cliente API tipado desde @nexo/contracts, interceptores de correlation id, manejo RFC 9457.
- WebSocket con reconexión que invalida queries de postulaciones y notificaciones.
- Portal candidato: landing, registro, onboarding de CV (importar o crear), editor de skills con
  niveles, Mejorar CV (vista dividida con aceptar/rechazar y streaming), explorar vacantes con
  búsqueda semántica, detalle con SkillRadarChart + MatchScoreRing + strengths/gaps, postular,
  dashboard de postulaciones con ApplicationStepper y mensajes, calendario de entrevistas con
  "Sincronizar con Google Calendar" y "Copiar feed ICS", auto-apply (reglas, consentimiento, bitácora),
  notificaciones y preferencias por canal.
- Look & feel moderno AI-native (aurora gradient, glass en destacados, ⌘K, animaciones con
  prefers-reduced-motion).
- MSW con handlers generados desde OpenAPI para desarrollo y tests.
- Presupuesto: LCP < 2 s, INP < 200 ms, JS inicial < 180 KB gzip (Lighthouse CI).
```

### P4.4 · nexo-web: portal empleador 🧪 🛡️
📁 `nexo-web`
```text
[Prompt 0]
Implementa el área /e:
- Dashboard: KPIs, funnel, tabla de vacantes con posiciones cubiertas/totales y postulantes, lista de
  postulaciones estancadas con acciones rápidas.
- Crear vacante con asistente IA (descripción y skills sugeridas con streaming) → pago con Stripe
  Checkout → estado publicado.
- Importar vacantes: pestañas API (muestra endpoint y API key), Endpoint registrado (formulario de
  fuente y mapeo), CSV, PDF, Conectores, MCP; preview editable, costo en créditos y confirmación.
- Vacante → candidatos: ranking por match, comparación de radar de hasta 3 candidatos, resumen IA
  marcado como no decisorio, kanban de estatus con optimistic updates y rollback, mensajes, botón
  "Agendar con Calendly".
- Cerrar vacante: modal Ocupada / Cancelada / En pausa con motivo y mensaje.
- Integraciones (Calendly, Slack, Teams, SAP/CRM, API keys), facturación (plan, créditos, portal
  Stripe), copiloto RAG en panel lateral con citas.
```

### P4.5 · nexo-admin 🧪
📁 `nexo-admin`
```text
[Prompt 0]
Crea nexo-admin con @nexo/ui: CRUD con DataTable (filtros, búsqueda, acciones masivas) de usuarios,
organizaciones, vacantes y candidatos; suspensión y reactivación; impersonation auditada; planes y
cupones; monitoreo de integraciones y DLQ con reproceso; auditoría de IA (trazas de ai_audit_log,
reporte de sesgo con regla 4/5 por vacante); métricas de plataforma. Solo rol platform_admin con MFA.
```

---

# FASE 5 · Pruebas y evals 📚 M8, M11, M12 · 🔁 v2 (núcleo cubierto por C2–C8; pendiente C9)

### P5.1 · Contratos entre repos 🧪
```text
[Prompt 0]
Configura un Pact Broker (contenedor en docker-compose y en staging). Asegura consumer tests en
nexo-bff-web, nexo-bff-mobile y nexo-web (contra BFF) y provider verification en cada servicio.
Agrega validación de eventos publicados contra AsyncAPI/JSON Schema en los tests de integración de
cada productor. Configura "can-i-deploy" como gate en CI.
```

### P5.2 · E2E 🧪
📁 `nexo-web` (o `nexo-e2e`)
```text
[Prompt 0]
Implementa con Playwright los 7 flujos E2E de docs/10 §5 contra el entorno local completo
(docker compose + servicios) y contra staging. Usa fixtures por rol, tarjeta de prueba de Stripe,
webhook de Calendly simulado, reloj simulado para el recordatorio de 5 días y Mailpit para verificar
emails. Graba traza y video en fallos. Etiqueta @smoke los 3 más críticos.
```

### P5.3 · No funcionales
```text
[Prompt 0]
1. k6: escenarios para candidate dashboard, búsqueda semántica, importación de 1,000 vacantes y
   ráfaga de 500 postulaciones; umbrales de docs/10 §6.
2. Resiliencia: pruebas que simulan caída de Slack, throttling de Bedrock y timeout de Calendly;
   verifica DLQ, reintentos y que no se pierdan eventos.
3. Seguridad: OWASP ZAP baseline en staging, pruebas de autorización cruzada entre tenants en cada
   endpoint, Semgrep y gitleaks en CI.
Genera reports/nonfunctional.md con resultados.
```

### P5.4 · Evals de IA del producto 🛡️
📁 `nexo-evals`
```text
[Prompt 0]
Crea los datasets sintéticos y las evals de docs/03 §8: extracción de skills de CV (F1), PDF
multi-vacante (segmentación y campos), matching (precision@10, nDCG@10), RAG del copiloto
(faithfulness, context recall, citas válidas), sesgo con pares contrafactuales (Δ score ≤ 0.02) y
prompt injection en documentos (0 % éxito). Usa promptfoo para prompts y scripts TS para el resto.
Integra en CI de ai-svc cuando cambien prompts o código de IA. Reporte en reports/ai-evals.md.
```

### P5.5 · Evals del harness 🛡️ 📚 M8
📁 `nexo-evals/harness`
```text
[Prompt 0]
Construye la suite de evaluación del harness según docs/12 §6: 20 tareas reproducibles (repo en commit
fijo, enunciado, pruebas ocultas, rúbrica) de tipos feature, bugfix, cross-repo, guardrail trampa y
spec ambigua. Script que ejecuta cada tarea con el agente en modo no interactivo y versiones del
harness v1 (solo AGENTS.md), v2 (+skills), v3 (+hooks +reviewer), N=3 corridas por tarea. Mide éxito,
apego a spec (LLM-as-judge + muestra humana), violaciones de guardrails (harness-log.jsonl),
iteraciones, tokens y tiempo. Genera reports/harness-comparison.md con tablas y conclusiones.
```

---

# FASE 6 · Despliegue en AWS · ⏳ pendiente

### P6.1 · Infraestructura con CDK 🧭 🛡️
📁 `nexo-infra`
```text
[Prompt 0]
Implementa nexo-infra (AWS CDK v2 TypeScript) según docs/11: network, data (Aurora Serverless v2
PostgreSQL 16 con pgvector y parameter group, Valkey, S3 con KMS y bloqueo público, KMS keys),
identity (Cognito user pools, grupos por rol, MFA, social IdPs, post-confirmation trigger),
messaging (bus EventBridge nexo-domain, reglas por consumidor, SQS + DLQ, Scheduler, SES con dominio
verificado, SNS platform applications FCM/APNs), compute (ECS cluster, ALB, construct NexoService con
autoscaling por CPU y profundidad de cola, roles de mínimo privilegio, secretos), edge (CloudFront
con dos orígenes S3 web/admin y ALB, WAF managed rules, ACM, Route 53), realtime (API Gateway
WebSocket + Lambdas), ai (permisos Bedrock por modelo, Textract), observability (dashboards,
alarmas, X-Ray, Langfuse en ECS). Config por entorno dev/staging/prod. Tests de CDK (assertions y
snapshot) y cdk-nag sin errores. No ejecutes cdk deploy: solo synth y diff.
```

### P6.2 · CI/CD 🛡️
```text
[Prompt 0]
Configura GitHub OIDC → roles IAM por repo y entorno (en nexo-infra). Completa los workflows
reutilizables de nexo-workspace:
- service-ci: lint, typecheck, unit, integración (Testcontainers), contrato + can-i-deploy, evals
  (condicional), Semgrep, gitleaks, build de imagen, Trivy, push a ECR firmado, tarea de migración,
  deploy dev, deploy staging tras E2E smoke, prod con aprobación manual y ECS blue/green (CodeDeploy)
  canary 10 % / 5 min con rollback automático por alarmas.
- frontend-ci: lint, tests, Storybook tests, visual, Lighthouse CI, build, preview por PR, deploy a
  S3 versionado + invalidación CloudFront.
- library-release: changesets y publicación en GitHub Packages.
Agrega a cada repo su workflow que invoca el reutilizable.
```

### P6.3 · Primer despliegue a staging
```text
[Prompt 0]
Guíame paso a paso (yo ejecuto los comandos con mis credenciales; tú no ejecutes nada contra AWS):
1. Bootstrap de CDK en las cuentas.
2. Orden de despliegue de stacks y verificación de cada uno.
3. Carga de secretos (Stripe test, Calendly, Slack, Teams, WhatsApp, Google OAuth) en Secrets Manager.
4. Habilitar acceso a modelos de Bedrock en la región.
5. Migraciones y seeds sintéticos.
6. Deploy de servicios y frontends por pipeline.
7. Smoke tests (@smoke) y checklist de verificación (dominios, CORS, WebSocket, webhooks registrados
   en Stripe y Calendly, emails en SES sandbox o producción).
8. Configurar AWS Budgets y alarmas de costo.
Genera runbooks/deploy-staging.md y runbooks/rollback.md en nexo-specs.
```

### P6.4 · Observabilidad y operación
```text
[Prompt 0]
Crea dashboards de CloudWatch (RED por servicio, colas y DLQ, tokens y costo de Bedrock, funnel de
negocio), alarmas con SNS a Slack, trazas end-to-end con correlationId desde el frontend hasta los
consumidores, y runbooks para: DLQ con mensajes, conector caído, Bedrock throttling, webhooks fallidos
de Stripe/Calendly, reindexado de pgvector.
```

---

# FASE 7 · Cierre y entrega

### P7.1 · Revisión adversarial final 🛡️
```text
[Prompt R] sobre el sistema completo: recorre cada spec de openspec/specs y verifica que exista
implementación y prueba para cada escenario; reporta gaps. Ejecuta el agente ai-red-team contra
ai-svc y el security-reviewer sobre los BFF. Consolida en nexo-specs/reviews/final-review.md.
```

### P7.2 · Evidencia del curso y demo
```text
[Prompt 0]
1. Actualiza readme-updated.md con URLs reales, capturas y video (secciones 0 a 6).
2. Genera EVIDENCIAS.md con enlaces a: harness por versión, changes archivados de OpenSpec, reviews
   adversariales y su resolución, harness-log.jsonl resumido (bloqueos de guardrails), reportes de
   evals (IA y harness), cobertura, Storybook publicado, resultados k6, documentación del legacy,
   reporte de sesgo y aviso de privacidad.
3. Escribe un guion de demo de 10 minutos: candidato importa CV → radar → postula → empleador mueve a
   preseleccionado → Calendly → stepper actualizado en tiempo real → recordatorio de 5 días →
   cierre de vacante → panel admin → evals del harness.
```

### P7.3 · Preparar fase móvil · ⏸️ PENDIENTE
> **Pendiente:** la implementación y las pruebas de las apps **iOS** y **Android** no se ejecutan en esta entrega
> (fuera del núcleo MVP, según el feedback). Ver `ios-prompts.md`, `android-prompts.md` y
> `openspec/changes/add-mobile-support/proposal.md`.
```text
[Prompt 0]
Revisa nexo-bff-mobile y docs para confirmar que exponen todo lo que necesitan las apps nativas
(auth, dashboard, detalle con radar, postulación, stepper, mensajes, calendario, notificaciones,
registro de dispositivo, deep links, CV upload). Lista los gaps y crea el change proposal
add-mobile-support. Después continúa con android-prompts.md e ios-prompts.md.
```
