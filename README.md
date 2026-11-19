# NexoTalent AI · núcleo MVP

Plataforma de reclutamiento con **match explicable** entre vacantes y candidatos. Este repositorio contiene el núcleo de punta a punta:
subir CV → confirmar skills → radar y score → postular → stepper → el reclutador cambia el estatus.

| Ruta | Qué es |
|---|---|
| `apps/api` | API · Node 24 + TypeScript + Fastify 5 + Zod, monolito modular hexagonal, PostgreSQL 16 + pgvector |
| `apps/web` | Web · React 19 + Vite + TanStack Query + React Router + Recharts |
| `tests/functional` | Pruebas funcionales en vivo (API y web levantadas) con `node:test` |
| `tests/e2e` | E2E en navegador con Playwright |
| `docker-compose.yml`, `apps/*/Dockerfile` | Bases de datos y stack completo en Docker |
| `Makefile` | Atajos de desarrollo (`make help`) |

## Inicio rápido

**Requisitos:** Node.js ≥ 24 y npm ≥ 10, Git, `make` y Docker Desktop (para PostgreSQL o el stack completo).
Para los E2E se usa Google Chrome instalado; si no lo tienes: `npx playwright install chromium` y `PW_CHANNEL=chromium`.

### Opción A · Local (API y web en tu máquina, bases en Docker)

```bash
git clone https://github.com/gcortes83/nexotalent.git && cd nexotalent
make setup    # solo la primera vez: npm ci, crea apps/api/.env y apps/web/.env, levanta las bases y migra + datos de demo
make start    # API (:4000) y web (:5173) a la vez con recarga en caliente; Ctrl-C detiene los dos
```

¿Sin Docker? `make install env && make start-memory` arranca la API con almacenamiento en memoria (mismos datos sintéticos; se reinician al reiniciar la API).

### Opción B · Todo en Docker

```bash
make docker-up     # construye las imágenes; levanta postgres, migrate (migra + datos de demo), api (:4000) y web (:8080)
make docker-logs   # logs de API y web
make docker-down   # detiene todo (el volumen de datos se conserva)
```

En Docker, nginx sirve la SPA y reenvía `/v1` y `/health` a la API (mismo origen, sin CORS). Cada `make docker-up` vuelve a cargar los datos de demo.

### URLs para probar en local

| Qué | Local (`make start`) | Docker (`make docker-up`) |
|---|---|---|
| Landing page | http://localhost:5173 | http://localhost:8080 |
| Login (correo + contraseña, pestañas Candidato / Empleador) | http://localhost:5173/login | http://localhost:8080/login |
| Interfaz en inglés (o selector ES / EN al pie de cualquier página) | http://localhost:5173/?lang=en | http://localhost:8080/?lang=en |
| Login de demo (cuentas sin contraseña) | http://localhost:5173/login?demo=1 | http://localhost:8080/login?demo=1 |
| Registro de candidato | http://localhost:5173/registro/candidato | http://localhost:8080/registro/candidato |
| Registro de empleador | http://localhost:5173/registro/empleador | http://localhost:8080/registro/empleador |
| Vacantes | http://localhost:5173/jobs | http://localhost:8080/jobs |
| Detalle con radar y score | http://localhost:5173/jobs/job_backend_node | http://localhost:8080/jobs/job_backend_node |
| Candidato · dashboard con stepper | http://localhost:5173/c/dashboard | http://localhost:8080/c/dashboard |
| Candidato · perfil, CV y vacantes aplicadas | http://localhost:5173/c/profile | http://localhost:8080/c/profile |
| Empleador · dashboard | http://localhost:5173/e/dashboard | http://localhost:8080/e/dashboard |
| Empleador · mis vacantes (crear, editar, publicar, cerrar) | http://localhost:5173/e/vacantes | http://localhost:8080/e/vacantes |
| Empleador · importar CSV / JSON / PDF | http://localhost:5173/e/importar | http://localhost:8080/e/importar |
| Correos enviados | http://localhost:4000/v1/dev/emails (simulados, `EMAIL_PROVIDER=log`) | http://localhost:8025 (Mailpit) |
| API · salud | http://localhost:4000/health | http://localhost:4000/health |
| API · vacantes | http://localhost:4000/v1/jobs | http://localhost:4000/v1/jobs |
| PostgreSQL desarrollo | `postgres://nexo:nexo_local_only@localhost:5432/nexotalent` | ídem |
| PostgreSQL pruebas | `postgres://nexo:nexo_local_only@localhost:5433/nexotalent_test` | ídem |

Contrato de la API: [`api/openapi.yaml`](api/openapi.yaml) (`npm run lint:api` lo valida).

**Cuentas de demo** (todas sintéticas, `example.com`). Entra sin contraseña en `/login?demo=1` (`DEMO_AUTH=true`) o en `/login` con la contraseña **`Demo1234`** eligiendo la pestaña correcta. También puedes crear tus propias cuentas en `/registro/candidato` y `/registro/empleador`.

| Cuenta | Rol | Para probar |
|---|---|---|
| `candidata@example.com` | Ana, candidata con skills | Radar, score, postulaciones, stepper |
| `nueva@example.com` | Sofía, candidata nueva | Subir CV → confirmar skills → postular |
| `candidato@example.com` | Luis, candidato Java | Postulación estancada (6 días) |
| `valeria@` · `diego@` · `mariana@` · `jorge@example.com` | Candidatos con skills técnicas y soft skills (datos, DevOps, UX/UI, frontend) | Perfiles completos y postulaciones en Banca, AgroTech y Turismo |
| `reclutador@example.com` | Rubén, reclutador Fintech | Candidatos por match, cambio de estatus |
| `reclutadora@example.com` | Rita, reclutadora Retail | Postulaciones estancadas a 3/5 días |
| `salud@example.com` · `logistica@example.com` · `edtech@example.com` · `banca@example.com` · `agro@example.com` · `turismo@example.com` | Reclutadores de Salud Digital, Logística, EdTech, Banca Digital, AgroTech y Turismo | Gestionar sus vacantes (catálogo de 100 vacantes en 6 países, 18 urgentes 🔥) |

Ejemplo con la API directamente:

```bash
TOKEN=$(curl -s -X POST localhost:4000/v1/auth/demo-login -H 'content-type: application/json' \
  -d '{"email":"candidata@example.com"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s localhost:4000/v1/jobs/job_backend_node/match -H "authorization: Bearer $TOKEN"
```

### Comandos `make`

| Comando | Qué hace |
|---|---|
| `make setup` | Solo la primera vez: instala dependencias, crea los `.env`, levanta las bases y migra (y carga datos de demo) |
| `make build` | Compila backend y frontend |
| `make build backend` | Compila solo el backend (`apps/api/dist`) |
| `make build frontend` | Compila solo el frontend (`apps/web/dist`) |
| `make db-up` | Levanta las dos bases de datos (desarrollo `:5432` y pruebas `:5433`) y espera a que estén sanas |
| `make start` | Levanta backend y frontend a la vez; Ctrl-C para los dos |
| `make help` | Lista todos los atajos |
| `make start-memory` | Como `start`, pero sin base de datos (`STORAGE=memory`) |
| `make stop` | Detiene la API y la web levantadas con `make start` / `make start-memory` (para Docker: `make docker-down`) |
| `make env` | Crea `apps/api/.env` y `apps/web/.env` desde `apps/*/env.example` (no sobrescribe) |
| `make db-migrate` · `make db-seed` · `make db-reset` | Migraciones · recarga de datos de demo · ambos |
| `make mail-up` | Levanta Mailpit (UI http://localhost:8025) para ver correos con `EMAIL_PROVIDER=smtp` |
| `make db-down` | Detiene las bases (conserva los datos) |
| `make typecheck` | Typecheck de API y web |
| `make test` | Pruebas unitarias y HTTP (API), componentes y páginas (web) y hooks del harness |
| `make test-api` · `make test-web` · `make test-hooks` | Cada suite por separado |
| `make coverage` | Cobertura (umbral 80 % en dominio y aplicación) |
| `make test-int` | Integración con PostgreSQL + pgvector reales (base de pruebas `:5433`) |
| `make test-functional` | Pruebas funcionales en vivo contra la app levantada |
| `make test-e2e` | E2E en navegador (Playwright + Chrome) contra la app levantada |
| `make test-all` | Typecheck + unitarias + integración |
| `make docker-build` · `make docker-up` · `make docker-down` · `make docker-logs` | Stack completo en Docker |
| `make docker-seed` | Vuelve a migrar y cargar los datos de demo en Docker |
| `make docker-test` | Funcionales + E2E contra el stack de Docker |
| `make clean` | Borra `dist`, cobertura y reportes |

`make buid …` funciona como alias de `make build …`.

### Pruebas

| Nivel | Dónde | Cómo se ejecuta | Qué cubre |
|---|---|---|---|
| Unitarias (API) | `apps/api/test/unit` | `make test-api` | Fórmula de match, máquina de estados, stepper, extractor y embeddings, configuración, casos de uso |
| HTTP (API) | `apps/api/test/http` | `make test-api` | Flujos de candidato y empleador con Fastify `inject` (sin red) |
| Unitarias (web) | `apps/web/src/**/*.test.tsx` | `make test-web` | Componentes (radar, stepper), cliente HTTP, páginas, guardas de rol y sesión |
| Integración | `apps/api/test/integration` | `make test-int` | Adaptadores PostgreSQL + pgvector reales |
| Funcionales en vivo | `tests/functional` | `make start` y en otra terminal `make test-functional` | Los casos de uso UC-00 a UC-16 (incluye registro, login con contraseña, perfil, gestión, cierre e importación de vacantes y notificaciones) contra la API real: auth, catálogo, match con ETag/304, CV → skills, postular, pipeline con `If-Match` (428/412/409), retiro, aislamiento entre organizaciones, estancadas 3/5; además, la SPA y el proxy `/v1` |
| E2E | `tests/e2e` | `make start` y en otra terminal `make test-e2e` | Navegador real: landing, registros, login, radar y score, vacante creada y publicada, CV en archivo, postulación, toasts y marcas «Seleccionado» y «Vacante cerrada», importación CSV |

Contra Docker: `make docker-up && make docker-test` (o `make test-functional WEB_URL=http://localhost:8080`).
Las funcionales y E2E se pueden repetir: cada corrida usa una vacante a la que Sofía aún no se ha postulado. Tras unas 8 corridas contra PostgreSQL, recarga los datos con `make db-seed` (o `make docker-seed`). En modo memoria basta reiniciar la API.

### Variables de entorno

`make env` crea `apps/api/.env` y `apps/web/.env` (ignorados por git) a partir de las plantillas `apps/api/env.example` y `apps/web/env.example`. Variables principales de la API: `STORAGE` (`memory` | `postgres`), `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET` (≥ 32 caracteres), `DEMO_AUTH`, `CORS_ORIGINS`, `AI_PROVIDER=mock`, `EMAIL_PROVIDER` (`log` | `smtp`) y `SMTP_URL`. Las variables exportadas en la terminal tienen prioridad sobre el `.env`.

### Problemas comunes

- **`Docker no está corriendo`**: abre Docker Desktop, o usa `make start-memory`.
- **Puerto 5432, 4000, 5173 u 8080 ocupado**: detén el otro proceso; no ejecutes `make start` y `make docker-up` a la vez (ambos usan el `:4000`).
- **Las funcionales se omiten («Sofía ya se postuló a todas las vacantes»)**: `make db-seed`.

---

## Índice

0. [Ficha del proyecto](#0-ficha-del-proyecto)
1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)

---

## 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

`Guillermo Damián Cortés Martínez`

### **0.2. Nombre del proyecto:**

**NexoTalent AI** — Plataforma de reclutamiento AI-native.

### **0.3. Descripción breve del proyecto:**

NexoTalent AI conecta vacantes y candidatos por **similitud semántica de skills** usando LLMs, embeddings y pgvector. El candidato importa o construye su CV con ayuda de IA, compara sus skills contra cada vacante en una **gráfica de radar**, postula manualmente o con **auto-apply** y sigue cada proceso con un **stepper** de estatus y un calendario de entrevistas sincronizado (Calendly + Google Calendar). El empleador paga para publicar, importa **1 o N vacantes** (API, endpoint registrado, CSV, PDF, conectores SAP/CRM/ATS y servidores **MCP**), revisa candidatos ordenados por match, agenda entrevistas y recibe recordatorios cuando una postulación lleva **3 o 5 días** sin cambio. Las notificaciones salen por in-app, email, WhatsApp, push, Slack y Microsoft Teams. Está construido como **polyrepo** de microservicios **Node.js** orientados a eventos, con frontend **React** y despliegue en **AWS**, siguiendo Spec Driven Development con OpenSpec, TDD y un harness de agentes con guardrails y evals.

### **0.4. URL del proyecto:**

Aun no disponible - `https://app.nexotalent.ai` (staging en AWS) · Storybook: `https://ui.nexotalent.ai`

### 0.5. URL o archivo comprimido del repositorio

`https://github.com/gcortes83/nexotalent` (meta-repo con `repos.yaml` que enlaza los demás repositorios del polyrepo).

---

## 1. Descripción general del producto

### **1.1. Objetivo:**

**Propósito.** Reducir el tiempo y la fricción de contratar y de encontrar empleo con IA explicable y responsable.

**Qué soluciona.**
- Los candidatos postulan "a ciegas", no saben por qué no avanzan y sufren *ghosting*.
- Los reclutadores filtran cientos de CVs por palabras clave, pierden talento y dejan postulaciones olvidadas.
- Las empresas capturan la misma vacante en varios sistemas (ERP, CRM, bolsas de trabajo) y los estatus no se sincronizan.

**Valor que aporta.**
1. **Match explicable:** score de 0 a 100 y radar de skills vacante vs. candidato con fortalezas y brechas.
2. **Cero ghosting:** alertas automáticas a los 3 días y escalamiento a los 5 días sin cambio de estatus.
3. **Ingesta universal** de 1..N vacantes y **sincronización bidireccional** de estatus con SAP, CRMs, ATS y MCP.
4. **Auto-apply responsable** con reglas, límite diario, consentimiento y bitácora.
5. **CV inteligente:** importación con extracción de skills o construcción guiada con sugerencias de IA.
6. **Comunicación omnicanal** con preferencias por usuario.

**Para quién.** Candidatos (perfiles técnicos y profesionales), reclutadores de agencias, áreas de talento de empresas medianas y grandes, y el equipo que opera la plataforma.

### **1.2. Características y funcionalidades principales:**

**Candidato**
| Funcionalidad | Descripción |
|---|---|
| Importar CV | Sube PDF/DOCX; la IA extrae experiencia, educación y skills con nivel 0–5; el candidato confirma o corrige. |
| Constructor y mejora de CV | Asistente de 5 pasos o mejora del CV importado (vista original ↔ propuesta), exportación PDF ATS-friendly. La IA nunca inventa experiencia. |
| Búsqueda semántica | "Backend con Node en fintech remoto" sin depender de palabras clave exactas. |
| Radar de skills | Gráfica de radar por categorías (lenguajes, frameworks, cloud, datos, soft skills, idiomas…) vacante vs. candidato, score y brechas. |
| Postulación y auto-apply | 1 clic o automática según reglas (match mínimo, ubicación, modalidad, salario, límite diario). |
| Dashboard de postulaciones | Todas las postulaciones con **stepper**: Postulado → En revisión → Preseleccionado → Entrevista agendada → Entrevista realizada → Oferta → Contratado (o No seleccionado / Retirado). Actualización en tiempo real. |
| Calendario de entrevistas | Entrevistas agendadas vía Calendly, sincronización con Google Calendar y feed ICS. |
| Notificaciones | In-app, email, WhatsApp y push (Android/iOS) en cada paso, con preferencias y horario de silencio. |

**Empleador / reclutador**
| Funcionalidad | Descripción |
|---|---|
| Publicación con pago | Pay-per-post, paquetes o suscripción con tarjeta (Stripe). |
| Importación 1..N | API, endpoint registrado (pull), webhook, CSV, PDF con varias vacantes, conectores SAP SuccessFactors/Workday/Salesforce/HubSpot/ATS y servidores MCP de proveedores. Vista previa y costo en créditos. |
| Dashboard | KPIs, funnel, **posiciones disponibles** vs. cubiertas y **número de postulantes** por vacante, postulaciones estancadas. |
| Revisión de candidatos | Ranking por match, comparación de radar de hasta 3 candidatos, resumen IA no decisorio, kanban de estatus, mensajes dentro de la postulación. |
| Entrevistas | Link de Calendly de un solo uso; el estatus avanza solo al agendarse. |
| Cierre de vacantes | Ocupada (`filled`), Cancelada (`cancelled`) o En pausa (`on_hold`) con motivo y aviso a postulantes. |
| Recordatorios | A 3 días (reclutador) y 5 días (también admin de la organización) por email, Slack, Teams y push, con acciones rápidas. |
| Copiloto RAG | Preguntas en lenguaje natural sobre sus candidatos con citas. |

**Administración de plataforma:** CRUD y moderación de usuarios, organizaciones, vacantes y candidatos; planes y cupones; monitoreo de integraciones y DLQ; auditoría de IA y reportes de sesgo.

**IA en el núcleo:** LLMs en Amazon Bedrock para extracción estructurada, mejora de CV, resúmenes y agentes; embeddings + pgvector para búsqueda y matching híbrido; RAG con búsqueda híbrida y rerank; servidor **MCP** propio que expone la plataforma a agentes, y clientes MCP para consumir bolsas de trabajo.

**Modelo de negocio sugerido:** Pay-per-post ($599 MXN), Pack 5 ($2,499 MXN), Pro ($4,999 MXN/mes), Business ($12,999 MXN/mes) y Enterprise a la medida; add-ons de vacante destacada, multiposting y créditos de screening. Detalle y benchmark de competidores en [docs/01-vision-producto.md](docs/01-vision-producto.md).

### **1.3. Diseño y experiencia de usuario:**

**Dirección visual AI-native:** modo oscuro por defecto (con modo claro), fondo *aurora gradient* violeta → cian, superficies *glass* en tarjetas destacadas, tipografía Geist, señales de IA consistentes (✦, borde con gradiente animado mientras la IA trabaja, *shimmer*, texto en *streaming*), *command palette* ⌘K y cumplimiento WCAG 2.2 AA. Detalle en [docs/08-frontend-ux.md](docs/08-frontend-ux.md).

**Recorrido del candidato**
1. Landing y registro con Google/Apple/LinkedIn. `![Landing]({{docs/img/01-landing.png}})`
2. Onboarding: "Importa tu CV" → skills extraídas como chips editables con nivel. `![Onboarding CV]({{docs/img/02-onboarding-cv.png}})`
3. Mejorar CV con sugerencias de IA aceptables por bloque. `![Mejorar CV]({{docs/img/03-mejorar-cv.png}})`
4. Explorar vacantes con búsqueda semántica y score en cada tarjeta. `![Explorar]({{docs/img/04-explorar.png}})`
5. Detalle de vacante con **radar de skills**, score y brechas → Postular / Activar auto-apply. `![Radar]({{docs/img/05-radar.png}})`
6. Dashboard de postulaciones con **stepper** por vacante y mensajes. `![Dashboard candidato]({{docs/img/06-dashboard-candidato.png}})`
7. Calendario de entrevistas con sincronización a Google Calendar. `![Calendario]({{docs/img/07-calendario.png}})`

**Recorrido del empleador**
1. Dashboard con KPIs, funnel y postulaciones estancadas. `![Dashboard empleador]({{docs/img/08-dashboard-empleador.png}})`
2. Crear vacante con asistente IA → pago con tarjeta. `![Crear y pagar]({{docs/img/09-crear-pagar.png}})`
3. Importar vacantes por CSV/PDF con vista previa y costo. `![Importar]({{docs/img/10-importar.png}})`
4. Candidatos por vacante con comparación de radar y kanban. `![Candidatos]({{docs/img/11-candidatos.png}})`
5. Agendar con Calendly y cerrar vacante. `![Agendar y cerrar]({{docs/img/12-agendar-cerrar.png}})`

**Panel admin:** `![Admin]({{docs/img/13-admin.png}})`

**Videotutorial:** `{{https://youtu.be/...}}`

### **1.4. Instrucciones de instalación:**

**Requisitos:** Node.js 24 LTS, npm 10+, Git, `make` y Docker Desktop (sin Docker: `make start-memory`).

> El repositorio `gcortes83/nexotalent` contiene el **núcleo MVP** como monorepo (`apps/api` + `apps/web`), según [ADR-0001](docs/adr/0001-monolito-modular-mvp.md). El polyrepo `nexo-workspace` / `repos.yaml` de `docs/02` es la visión v2 y no existe todavía.

```bash
make setup        # primera vez: dependencias, .env, bases de datos, migraciones y datos de demo
make start        # local: API http://localhost:4000 · web http://localhost:5173
make docker-up    # o todo en Docker: web http://localhost:8080 · API http://localhost:4000
make test         # unitarias; con la app levantada: make test-functional y make test-e2e
```

Instrucciones completas, URLs, cuentas de demo y todos los comandos `make`: ver [Inicio rápido](#inicio-rápido).

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

```mermaid
flowchart TB
  subgraph Clients
    web[nexo-web · React 19]
    admin[nexo-admin · React 19]
    mob[Apps Android / iOS · fase 2]
  end
  cf[CloudFront + WAF]
  web & admin & mob --> cf
  cf --> bffw[nexo-bff-web · Fastify]
  cf --> bffm[nexo-bff-mobile · Fastify]
  cf --> ws[nexo-realtime · WebSocket]
  cog[Cognito]
  bffw & bffm -.JWT.-> cog

  subgraph Services["Microservicios Node.js 24 · TypeScript · Fastify"]
    idn[identity]
    jobs[jobs]
    cand[candidates]
    apps[applications]
    ai[ai]
    ing[ingestion]
    integ[integrations]
    sched[scheduling]
    notif[notifications]
    bill[billing]
    mcp[nexo-mcp-server]
  end
  bffw & bffm --> idn & jobs & cand & apps & ai & sched & bill

  eb{{EventBridge + SQS + DLQ}}
  jobs & cand & apps & ing & integ & sched & bill & ai -- outbox --> eb
  eb --> notif & ai & apps & jobs & integ & ws

  pg[(Aurora PostgreSQL + pgvector)]
  redis[(Valkey / Redis)]
  s3[(S3)]
  Services --> pg
  bffw & bffm & ai --> redis
  ing & cand --> s3

  ai --> bed[Amazon Bedrock · LLM + embeddings]
  ing --> tex[Textract]
  integ <--> ext[SAP · Salesforce · HubSpot · ATS · MCP externos]
  sched <--> cal[Calendly · Google Calendar]
  bill <--> stripe[Stripe]
  notif --> ch[SES · WhatsApp · SNS FCM/APNs · Slack · Teams]
```

**Patrones:** microservicios por *bounded context* (DDD), **arquitectura orientada a eventos** con EventBridge + SQS y **patrón outbox**, **BFF** por canal, **hexagonal** (ports & adapters) dentro de cada servicio y **capa anticorrupción** para integraciones externas. La IA es un plano transversal (`ai-svc`) consumido por varios dominios.

**Justificación.** Las cargas son muy distintas (ingesta masiva y LLM frente a lecturas de dashboard), las integraciones externas son muchas y cambiantes, y los procesos son naturalmente asíncronos (pagos, webhooks, notificaciones, recordatorios). EDA desacopla esos flujos; el BFF reduce las llamadas desde el cliente; pgvector evita un motor vectorial adicional.

**Beneficios:** escalado independiente, aislamiento de fallos (si falla Slack no falla la postulación), nuevos conectores sin tocar el núcleo, trazabilidad completa para auditoría de IA, despliegues independientes por repo.

**Sacrificios:** mayor complejidad operativa y de pruebas, consistencia eventual, costo base superior a un monolito, *debugging* distribuido. **Mitigación:** OpenTelemetry con `correlationId`, contract testing, y despliegue modular en el MVP (varios servicios por tarea ECS sin romper sus límites).

**Optimización de llamadas:** endpoints agregados por pantalla (1 llamada en lugar de 5–8), llamadas paralelas con keep-alive, DataLoader, read models CQRS, caché Redis con invalidación por eventos, ETag/304, paginación por cursor, WebSocket/SSE en vez de *polling*, contadores desnormalizados, batch de embeddings y prompt caching. Detalle en [docs/02-arquitectura.md](docs/02-arquitectura.md).

### **2.2. Descripción de componentes principales:**

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| `nexo-web` | React 19, Vite, TanStack Router/Query, Tailwind v4, Recharts, Motion | Portales de candidato y empleador. |
| `nexo-admin` | React 19 + `@nexo/ui` | Administración de usuarios, organizaciones, vacantes, candidatos, integraciones y auditoría IA. |
| `nexo-ui` | React, Radix, Tailwind, Storybook | Design system: tokens, `SkillRadarChart`, `ApplicationStepper`, `KanbanBoard`, señales de IA. |
| `nexo-bff-web` / `nexo-bff-mobile` | Fastify, undici, DataLoader, Redis | Agregación por pantalla, caché, ETag, autorización. |
| `identity-svc` | Fastify, Drizzle, Cognito | Usuarios, organizaciones, roles, API keys. |
| `jobs-svc` | Fastify, Drizzle | Vacantes, estados, posiciones, contadores. |
| `candidates-svc` | Fastify, Drizzle, S3 | Perfil, CV, skills, ARCO. |
| `applications-svc` | Fastify, Drizzle, Scheduler | Postulaciones, pipeline, mensajes, recordatorios 3/5 días, auto-apply. |
| `ai-svc` | Fastify, Bedrock (Converse), pgvector, Langfuse | LLM gateway, embeddings, extracción, matching, radar, RAG, agentes. |
| `ingestion-svc` | Fastify, csv-parse, pdf-parse, Textract | Importación 1..N por API, endpoint, webhook, CSV y PDF. |
| `integrations-svc` | Fastify, adaptadores, MCP SDK, opossum | SAP, Salesforce, HubSpot, ATS, legacy, MCP; sincronización de estatus. |
| `scheduling-svc` | Fastify, Calendly API, Google Calendar API | Links de agenda, webhooks, calendario del candidato, ICS. |
| `notifications-svc` | SES, WhatsApp Cloud API, SNS, Slack, Teams | Notificaciones omnicanal con preferencias. |
| `billing-svc` | Stripe | Planes, pagos, suscripciones, créditos. |
| `nexo-mcp-server` | MCP TypeScript SDK, OAuth 2.1 | Expone la plataforma como tools MCP. |
| `nexo-realtime` | API Gateway WebSocket + Lambda | Actualizaciones en tiempo real. |
| Datos | Aurora PostgreSQL 16 + pgvector, Valkey, S3 | Relacional + vectores, caché, archivos. |
| Mensajería | EventBridge, SQS, Scheduler | Bus de dominio, colas por consumidor, tareas programadas. |

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Estructura actual (núcleo MVP, monorepo):**

```
nexotalent/
├── AGENTS.md  CLAUDE.md  .claude/   # harness: hooks probados, subagentes, comandos
├── openspec/                        # project.md, specs (matching, applications-pipeline, candidate-profile), changes
├── api/openapi.yaml                 # contrato ejecutable del núcleo
├── apps/api/                        # monolito modular hexagonal (Fastify + Zod)
│   ├── src/modules/<ctx>/{domain,application}   # identity, jobs, candidates, matching, applications
│   ├── src/infra/{http,db,memory,ai}            # adaptadores
│   ├── src/ports.ts  src/seed/  migrations/  test/{unit,http,integration}
├── apps/web/                        # React 19 + Vite + TanStack Query + Recharts
│   └── src/{api,auth,components,pages,test}
├── docs/                            # documentación, adr/, evidence/ (TDD rojo→verde), reviews/
└── docker-compose.yml               # PostgreSQL 16 + pgvector
```

**Visión v2 (polyrepo):** el proyecto evoluciona a un **polyrepo**. Los contratos (OpenAPI, AsyncAPI, JSON Schemas, OpenSpec, prompts y documentación) viven solo en `nexo-specs` y se distribuyen como el paquete `@nexo/contracts`.

```
nexo-workspace/        # meta-repo: repos.yaml, scripts, docker-compose, workflows reutilizables, AGENTS.md
nexo-specs/            # openspec/, api/, asyncapi/, schemas/, prompts/, docs/, adr/, runbooks/, reviews/
nexo-harness/          # skills, hooks, subagentes y plantillas AGENTS.md compartidas
nexo-shared-node/      # logger, OTel, auth, outbox, consumidor SQS, cliente HTTP
nexo-ui/               # design system + Storybook
nexo-web/  nexo-admin/ # frontends React
nexo-bff-web/  nexo-bff-mobile/
nexo-<dominio>-svc/    # 10 microservicios
nexo-mcp-server/  nexo-realtime/
nexo-infra/            # AWS CDK
nexo-evals/            # evals de IA y del harness
legacy-ats-sim/        # ATS legacy simulado (módulo AI for Legacy)
nexo-android/  nexo-ios/  # fase 2
```

Estructura interna de un microservicio (**arquitectura hexagonal**):

```
nexo-applications-svc/
├── AGENTS.md  CLAUDE.md  .claude/      # harness del agente
├── src/
│   ├── domain/          # entidades, value objects, máquina de estados, errores (sin dependencias)
│   ├── application/     # casos de uso y puertos (interfaces)
│   ├── infra/
│   │   ├── http/        # rutas Fastify y schemas generados desde @nexo/contracts
│   │   ├── db/          # esquema Drizzle, repositorios, outbox
│   │   ├── messaging/   # consumidores SQS y publicador
│   │   └── clients/     # clientes HTTP a otros servicios
│   └── main.ts          # composición e inyección de dependencias
├── migrations/
├── test/ unit/ integration/ contract/
└── Dockerfile
```

Frontend (`nexo-web`): `src/routes/` (TanStack Router por área `c/` y `e/`), `src/features/<dominio>/` (componentes, hooks y queries por funcionalidad), `src/api/` (cliente tipado), `src/realtime/`, `src/mocks/` (MSW).

### **2.4. Infraestructura y despliegue**

```mermaid
flowchart LR
  user([Usuarios]) --> cf[CloudFront + WAF]
  cf --> s3w[(S3 · web/admin)]
  cf --> alb[ALB]
  cf --> wsg[API GW WebSocket]
  subgraph VPC[VPC privada · 3 AZ]
    alb --> ecs[ECS Fargate · BFFs y servicios]
    lam[Lambda · stale sweep, antivirus, realtime]
    ecs --> aur[(Aurora Serverless v2 + pgvector)]
    ecs --> val[(Valkey)]
  end
  ecs <--> eb{{EventBridge · SQS · Scheduler}}
  eb --> lam
  ecs --> bed[Bedrock] & tex[Textract] & ses[SES] & sns[SNS] & sm[Secrets Manager]
  wsg --> lam
```

- **IaC:** AWS CDK (TypeScript) en `nexo-infra`, con stacks de red, datos, identidad, mensajería, cómputo, edge, IA y observabilidad, y un construct `NexoService` reutilizable.
- **Entornos:** `dev`, `preview` por PR, `staging` y `prod` en cuentas separadas (AWS Organizations).
- **CI/CD (GitHub Actions + OIDC):** lint → typecheck → unit → integración → contrato (`can-i-deploy`) → evals IA → Semgrep/gitleaks/Trivy → imagen firmada en ECR → migración (*expand/contract*) → dev → E2E smoke en staging → aprobación → **canary 10 % blue/green** en prod con rollback automático por alarmas. Frontends a S3 versionado + invalidación de CloudFront.
- **Observabilidad:** OpenTelemetry → X-Ray y CloudWatch, Langfuse para trazas de LLM, alarmas de errores, latencia, DLQ y costo de Bedrock.

Detalle en [docs/11-infraestructura-aws.md](docs/11-infraestructura-aws.md).

### **2.5. Seguridad**

| Práctica | Ejemplo |
|---|---|
| Autenticación con Cognito, MFA para empleadores y admins, tokens cortos con refresh rotativo | JWT validado en el BFF con JWKS en caché. |
| Autorización RBAC + multi-tenant con **Row Level Security** | `CREATE POLICY tenant_isolation ON applications.application USING (organization_id = current_setting('app.tenant_id'));` |
| Validación de toda entrada con JSON Schema y Zod, rate limiting por usuario/API key | Fastify `schema` en cada ruta; 429 con `Retry-After`. |
| Webhooks firmados e idempotentes | `stripe.webhooks.constructEvent(rawBody, signature, secret)`; firma de Calendly; HMAC en webhooks de ingesta. |
| Archivos seguros | URLs prefirmadas de 5 min, verificación de *magic bytes*, antivirus, cifrado SSE-KMS. |
| Secretos en Secrets Manager, nunca en el código | gitleaks en CI y en hooks del agente. |
| Red privada | Servicios en subredes privadas, VPC endpoints para S3/Bedrock, WAF con reglas administradas. |
| Logs sin PII | `pino({ redact: ['req.headers.authorization', '*.email', '*.phone'] })`. |
| Seguridad de LLM (OWASP LLM Top 10) | PII redactada antes del LLM, contenido de CVs/PDFs tratado como datos no confiables, tools con efecto no disponibles durante extracción, validación de salida. |
| Privacidad y ética | Aviso de privacidad y derechos ARCO (LFPDPPP), consentimiento para auto-apply, atributos protegidos excluidos del matching, decisiones finales siempre humanas, auditoría en `ai_audit_log`. |
| Guardrails del agente de desarrollo | Hooks que bloquean comandos destructivos, edición de `.env`, cambios fuera del alcance de la spec y datos personales reales en fixtures. |

Detalle en [docs/09-seguridad-privacidad-etica.md](docs/09-seguridad-privacidad-etica.md) y [docs/12-harness-sdd-guardrails.md](docs/12-harness-sdd-guardrails.md).

### **2.6. Tests**

Se sigue **TDD** y la **pirámide de pruebas** (≈65 % unit, 20 % integración, 10 % contrato, 5 % E2E):

- **Unitarias (Vitest):** máquina de estados de postulación (p. ej. rechaza `hired → in_review`), fórmula de matching y agrupación del radar, barrido de estancamiento con reloj inyectado (2, 3, 4, 5 y 6 días), ledger de créditos, validación de filas de CSV.
- **Integración (Testcontainers):** consultas HNSW de pgvector con filtros y RLS entre tenants, outbox + publicación en LocalStack, CSV de 10,000 filas, webhooks de Stripe (stripe-mock) y Calendly (WireMock).
- **Contrato:** Pact entre BFFs y servicios con `can-i-deploy`; eventos validados contra AsyncAPI/JSON Schema.
- **Design system:** interaction tests y accesibilidad (axe) en Storybook, regresión visual con Playwright para `SkillRadarChart` y `ApplicationStepper` en tema claro/oscuro y móvil.
- **E2E (Playwright):** importar CV → radar → postular → stepper; crear vacante → pago → publicada; importar CSV; preseleccionar → Calendly → "Entrevista agendada"; recordatorio a 5 días; cierre de vacante; admin suspende usuario.
- **No funcionales:** k6 (dashboard p95 < 300 ms a 200 RPS), resiliencia ante fallas de Slack/Bedrock, OWASP ZAP.
- **Evals de IA:** F1 de extracción de skills, precision@10 del matching, fidelidad y citas del RAG, sesgo contrafactual y prompt injection.
- **Evals del harness:** 20 tareas reproducibles para comparar versiones del harness del agente de desarrollo.

Detalle en [docs/10-estrategia-testing.md](docs/10-estrategia-testing.md).

---

## 3. Modelo de Datos

### **3.1. Diagrama del modelo de datos:**

```mermaid
erDiagram
  ORGANIZATION ||--o{ MEMBERSHIP : "tiene"
  USER ||--o{ MEMBERSHIP : "pertenece"
  USER ||--o| CANDIDATE : "es"
  ORGANIZATION ||--o{ JOB : "publica"
  JOB ||--o{ JOB_SKILL : "requiere"
  SKILL ||--o{ JOB_SKILL : "en"
  CANDIDATE ||--o{ CANDIDATE_SKILL : "posee"
  SKILL ||--o{ CANDIDATE_SKILL : "en"
  CANDIDATE ||--o{ RESUME : "sube"
  CANDIDATE ||--o{ APPLICATION : "postula"
  JOB ||--o{ APPLICATION : "recibe"
  APPLICATION ||--o{ APPLICATION_STATUS_HISTORY : "registra"
  APPLICATION ||--o{ APPLICATION_MESSAGE : "contiene"
  APPLICATION ||--o{ INTERVIEW : "agenda"
  CANDIDATE ||--o{ AUTO_APPLY_RULE : "define"
  CANDIDATE ||--o{ MATCH_SCORE : "tiene"
  JOB ||--o{ MATCH_SCORE : "tiene"
  ORGANIZATION ||--o{ IMPORT_BATCH : "importa"
  IMPORT_BATCH ||--o{ IMPORT_ITEM : "contiene"
  ORGANIZATION ||--o{ INTEGRATION_CONNECTION : "configura"
  PLAN ||--o{ SUBSCRIPTION : "define"
  ORGANIZATION ||--o{ SUBSCRIPTION : "contrata"
  ORGANIZATION ||--o{ CREDIT_LEDGER : "acumula"
  USER ||--o{ NOTIFICATION : "recibe"
  USER ||--o{ DEVICE : "registra"

  ORGANIZATION {
    text id PK "ULID"
    text name "NOT NULL"
    text slug UK "NOT NULL"
    text country "NOT NULL"
    text plan_tier "free|pro|business|enterprise"
    int stale_days_warning "default 3"
    int stale_days_escalation "default 5"
  }
  USER {
    text id PK
    text cognito_sub UK "NOT NULL"
    text email UK "NOT NULL"
    text full_name "NOT NULL"
    text phone_e164
    text locale "default es-MX"
    text timezone
    text platform_role "user|platform_admin"
    text status "active|suspended|deleted"
  }
  MEMBERSHIP {
    text id PK
    text organization_id FK "NOT NULL"
    text user_id FK "NOT NULL"
    text role "recruiter|employer_admin"
  }
  JOB {
    text id PK
    text organization_id FK "NOT NULL"
    text title "NOT NULL"
    text description "NOT NULL"
    text status "draft|pending_payment|published|on_hold|filled|cancelled|expired"
    text close_reason
    int positions_total "NOT NULL, > 0"
    int positions_filled "default 0, <= positions_total"
    int applicants_count "default 0"
    text modality "onsite|hybrid|remote"
    text country
    numeric salary_min
    numeric salary_max
    text source_type
    text external_id "UK con org y source"
    vector embedding "vector(1024)"
    timestamptz published_at
  }
  SKILL {
    text id PK
    text name UK "NOT NULL"
    text category "NOT NULL"
    vector embedding "vector(1024)"
  }
  JOB_SKILL {
    text job_id PK,FK
    text skill_id PK,FK
    smallint level "0-5"
    numeric weight "0-1"
    boolean must_have
  }
  CANDIDATE {
    text id PK
    text user_id FK,UK "NOT NULL"
    text headline
    text seniority
    text country
    numeric expected_salary_min
    boolean open_to_work "default true"
    smallint profile_completeness "0-100"
    vector embedding "vector(1024)"
  }
  CANDIDATE_SKILL {
    text candidate_id PK,FK
    text skill_id PK,FK
    smallint level "0-5"
    text source "declared|extracted|verified"
    boolean confirmed "default false"
  }
  RESUME {
    text id PK
    text candidate_id FK "NOT NULL"
    text s3_key "NOT NULL"
    text parse_status "pending|parsed|failed|needs_review"
    jsonb parsed_data
    boolean is_primary
  }
  APPLICATION {
    text id PK
    text job_id FK "NOT NULL, UK con candidate_id"
    text candidate_id FK "NOT NULL"
    text organization_id "NOT NULL, RLS"
    text status "submitted|in_review|shortlisted|interview_scheduled|interview_done|offer|hired|rejected|withdrawn"
    text channel "manual|auto_apply|import"
    numeric match_score "0-100"
    timestamptz status_changed_at "NOT NULL"
    smallint stale_level "0|3|5"
    int version "concurrencia optimista"
  }
  APPLICATION_STATUS_HISTORY {
    bigint id PK
    text application_id FK "NOT NULL"
    text from_status
    text to_status "NOT NULL"
    text changed_by "NOT NULL"
    text reason
    timestamptz changed_at "NOT NULL"
  }
  APPLICATION_MESSAGE {
    text id PK
    text application_id FK "NOT NULL"
    text sender_user_id "NOT NULL"
    text body "NOT NULL"
    timestamptz read_at
  }
  INTERVIEW {
    text id PK
    text application_id FK "NOT NULL"
    text calendly_event_uri UK
    timestamptz starts_at
    text status "link_sent|scheduled|canceled|completed|no_show"
    text google_event_id
  }
  AUTO_APPLY_RULE {
    text id PK
    text candidate_id FK "NOT NULL"
    boolean active
    smallint min_match "default 75"
    smallint daily_cap "default 5"
    timestamptz consent_at "NOT NULL"
  }
  MATCH_SCORE {
    text candidate_id PK
    text job_id PK
    numeric score "0-100"
    jsonb radar
    jsonb factors
    text model_version
  }
  IMPORT_BATCH {
    text id PK
    text organization_id FK
    text channel "api|endpoint|csv|pdf|connector|mcp"
    text status
    int total_items
    text idempotency_key UK
  }
  IMPORT_ITEM {
    text id PK
    text batch_id FK
    jsonb canonical
    numeric confidence
    text status "valid|invalid|needs_review|imported"
    jsonb errors
  }
  INTEGRATION_CONNECTION {
    text id PK
    text organization_id FK
    text provider "sap_sf|workday|salesforce|hubspot|greenhouse|rest|mcp|legacy"
    text secret_arn
    jsonb field_mapping
    jsonb status_mapping
    text health
  }
  PLAN {
    text id PK
    text code UK
    int price_cents
    int job_credits
    int max_active_jobs
    text stripe_price_id UK
  }
  SUBSCRIPTION {
    text id PK
    text organization_id FK
    text plan_id FK
    text stripe_subscription_id UK
    text status
  }
  CREDIT_LEDGER {
    bigint id PK
    text organization_id FK
    int delta "NOT NULL"
    text reason "purchase|publish|refund|grant"
    text reference_id
  }
  NOTIFICATION {
    text id PK
    text user_id FK
    text event_type
    text channel "in_app|email|whatsapp|push|slack|teams"
    text status "queued|sent|delivered|failed|read"
  }
  DEVICE {
    text id PK
    text user_id FK
    text platform "android|ios|web"
    text push_token UK
  }
```

> Cada microservicio es dueño de su esquema. Las relaciones que cruzan esquemas (p. ej. `APPLICATION.job_id`) son referencias lógicas validadas por eventos, no FK físicas. Diagrama completo en [docs/06-modelo-datos.md](docs/06-modelo-datos.md).

### **3.2. Descripción de entidades principales:**

**`JOB` (esquema `jobs`) — Vacante**
| Atributo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | text | PK | ULID |
| organization_id | text | FK → ORGANIZATION, NOT NULL | Empresa dueña |
| title | text | NOT NULL, ≤ 160 | Título |
| description | text | NOT NULL | Descripción en markdown |
| status | text | NOT NULL, CHECK enum | `draft`, `pending_payment`, `published`, `on_hold`, `filled`, `cancelled`, `expired` |
| close_reason | text | obligatorio si `on_hold`, `filled` o `cancelled` | Motivo del cierre |
| positions_total | int | NOT NULL, CHECK > 0 | Posiciones disponibles |
| positions_filled | int | default 0, CHECK ≤ positions_total | Contrataciones |
| applicants_count | int | default 0 | Postulantes (actualizado por eventos) |
| source_type, external_id | text | UNIQUE(organization_id, source_type, external_id) | Origen de la importación |
| embedding | vector(1024) | índice HNSW parcial `WHERE status='published'` | Representación semántica |

Relaciones: 1:N con `JOB_SKILL`, `APPLICATION` y `MATCH_SCORE`; N:1 con `ORGANIZATION`.

**`CANDIDATE` (esquema `candidates`) — Candidato**
| Atributo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | text | PK | ULID |
| user_id | text | FK → USER, UNIQUE, NOT NULL | Relación 1:1 con usuario |
| headline, seniority, country | text | — | Datos profesionales |
| expected_salary_min | numeric | ≥ 0 | Expectativa salarial |
| open_to_work | boolean | default true | Visible para matching |
| profile_completeness | smallint | 0–100 | No considera foto (evita sesgo) |
| embedding | vector(1024) | HNSW `WHERE open_to_work` | Perfil semántico |

**`CANDIDATE_SKILL` / `JOB_SKILL`** — Tablas puente N:M con `SKILL`, PK compuesta. Guardan `level` (0–5); en vacante además `weight` y `must_have`; en candidato `source` y `confirmed` (solo las confirmadas cuentan para el match).

**`APPLICATION` (esquema `applications`) — Postulación**
| Atributo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | text | PK | ULID |
| job_id, candidate_id | text | NOT NULL, UNIQUE(job_id, candidate_id) | Una postulación por vacante |
| organization_id | text | NOT NULL | Aislamiento RLS |
| status | text | NOT NULL, CHECK enum | Pasos del stepper |
| channel | text | `manual`, `auto_apply`, `import` | Origen |
| match_score | numeric | 0–100 | Score al postular |
| status_changed_at | timestamptz | NOT NULL | Base del recordatorio 3/5 días |
| stale_level | smallint | 0, 3 o 5 | Evita avisos duplicados |
| version | int | NOT NULL | Concurrencia optimista (`If-Match`) |

Índice parcial `(status_changed_at) WHERE status IN ('submitted','in_review','shortlisted','interview_done','offer')`. 1:N con `APPLICATION_STATUS_HISTORY`, `APPLICATION_MESSAGE` e `INTERVIEW`.

**`INTERVIEW`** — 1:N con postulación (varias rondas). `calendly_event_uri` UNIQUE para idempotencia de webhooks; `google_event_id` para sincronizar el calendario del candidato.

**`MATCH_SCORE` (esquema `ai`)** — PK (candidate_id, job_id). `radar` = `[{axis, required, candidate}]`, `factors` = desglose de la fórmula, `model_version` permite invalidar.

**`IMPORT_BATCH` / `IMPORT_ITEM` (esquema `ingestion`)** — 1:N. `idempotency_key` UNIQUE; cada ítem guarda el registro canónico, nivel de confianza y errores.

**`INTEGRATION_CONNECTION`** — Conector por organización; los secretos se guardan en Secrets Manager (`secret_arn`); `status_mapping` traduce estatus para la sincronización bidireccional.

**`PLAN`, `SUBSCRIPTION`, `CREDIT_LEDGER` (esquema `billing`)** — El ledger es *append-only*; el saldo de créditos es `SUM(delta)` por organización.

**`NOTIFICATION`, `DEVICE`** — Bitácora por canal y tokens push de Android/iOS (UNIQUE).

---

## 4. Especificación de la API

Convenciones: REST JSON versionado (`/v1`), JWT de Cognito, errores RFC 9457, `Idempotency-Key` en POST, `ETag`/`If-Match`. Catálogo completo en [docs/07-api.md](docs/07-api.md).

```yaml
openapi: 3.1.0
info: { title: NexoTalent AI API, version: 1.0.0 }
servers: [{ url: https://api.nexotalent.ai }]
security: [{ bearerAuth: [] }]
paths:
  /v1/jobs/imports:
    post:
      summary: Importa 1..N vacantes (JSON) o un archivo CSV/PDF previamente subido
      parameters:
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - type: object
                  required: [jobs]
                  properties:
                    publishMode: { type: string, enum: [draft, publish], default: draft }
                    jobs: { type: array, minItems: 1, maxItems: 1000, items: { $ref: '#/components/schemas/CanonicalJob' } }
                - type: object
                  required: [fileType, s3Key]
                  properties:
                    fileType: { type: string, enum: [csv, pdf] }
                    s3Key: { type: string }
      responses:
        '202': { description: Aceptada, content: { application/json: { schema: { $ref: '#/components/schemas/ImportBatch' } } } }
        '400': { description: Datos inválidos }
        '402': { description: Créditos insuficientes }
        '409': { description: Idempotency-Key reutilizada con otro cuerpo }

  /v1/jobs/{jobId}/match:
    get:
      summary: Score de match y datos de radar del candidato autenticado
      parameters:
        - { in: path, name: jobId, required: true, schema: { type: string } }
        - { in: header, name: If-None-Match, required: false, schema: { type: string } }
      responses:
        '200': { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/JobMatch' } } } }
        '304': { description: Sin cambios }
        '404': { description: Vacante no publicada }

  /v1/applications/{applicationId}/status:
    patch:
      summary: Cambia el estatus de una postulación (reclutador)
      parameters:
        - { in: path, name: applicationId, required: true, schema: { type: string } }
        - { in: header, name: If-Match, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [in_review, shortlisted, interview_scheduled, interview_done, offer, hired, rejected] }
                reason: { type: string, maxLength: 500 }
                notifyCandidate: { type: boolean, default: true }
                message: { type: string, maxLength: 4000 }
      responses:
        '200': { description: Actualizada, content: { application/json: { schema: { $ref: '#/components/schemas/Application' } } } }
        '409': { description: Transición inválida }
        '412': { description: Versión desactualizada }
        '422': { description: Vacante cerrada o en pausa }

components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    CanonicalJob:
      type: object
      required: [title, description, positions, location]
      properties:
        externalId: { type: string }
        title: { type: string }
        description: { type: string }
        positions: { type: integer, minimum: 1 }
        location: { type: object, properties: { country: { type: string }, city: { type: string }, modality: { type: string, enum: [onsite, hybrid, remote] } } }
        skills: { type: array, items: { type: object, properties: { name: { type: string }, level: { type: integer, minimum: 0, maximum: 5 }, mustHave: { type: boolean } } } }
    ImportBatch:
      type: object
      properties:
        importId: { type: string }
        status: { type: string }
        totalItems: { type: integer }
        creditsRequired: { type: integer }
    JobMatch:
      type: object
      properties:
        jobId: { type: string }
        score: { type: number }
        radar: { type: array, items: { type: object, properties: { axis: { type: string }, required: { type: number }, candidate: { type: number } } } }
        strengths: { type: array, items: { type: string } }
        gaps: { type: array, items: { type: object, properties: { skill: { type: string }, requiredLevel: { type: integer }, currentLevel: { type: integer }, mustHave: { type: boolean } } } }
        explanation: { type: string }
    Application:
      type: object
      properties:
        id: { type: string }
        jobId: { type: string }
        status: { type: string }
        matchScore: { type: number }
        statusChangedAt: { type: string, format: date-time }
        version: { type: integer }
```

**Ejemplo · `GET /v1/jobs/job_01JB.../match`**
```json
{
  "jobId": "job_01JB...",
  "score": 82.4,
  "radar": [
    { "axis": "Lenguajes", "required": 4, "candidate": 4.5 },
    { "axis": "Frameworks", "required": 4, "candidate": 3 },
    { "axis": "Cloud", "required": 3, "candidate": 2 },
    { "axis": "Datos", "required": 3, "candidate": 4 },
    { "axis": "Soft skills", "required": 3, "candidate": 4 },
    { "axis": "Idiomas", "required": 3, "candidate": 3 }
  ],
  "strengths": ["Node.js", "PostgreSQL", "Comunicación"],
  "gaps": [{ "skill": "AWS Lambda", "requiredLevel": 3, "currentLevel": 1, "mustHave": false }],
  "explanation": "Cubres el 100 % de las skills obligatorias; tu mayor brecha está en Cloud."
}
```

**Ejemplo · `PATCH /v1/applications/app_01JB.../status`**
```http
PATCH /v1/applications/app_01JB.../status
If-Match: "7"
Content-Type: application/json

{ "status": "shortlisted", "notifyCandidate": true, "message": "¡Hola Ana! Nos gustó tu perfil." }
```
Respuesta `200` con `version: 8`; `409` si la transición no es válida (p. ej. `hired → in_review`).

---

## 5. Historias de Usuario

**Historia de Usuario 1 · Comparar mis skills con la vacante (radar)**

**Como** candidata que evalúa vacantes **quiero** ver una gráfica de radar que compare las skills que pide la vacante con las mías **para** decidir rápido si postular y saber qué me falta.

*Criterios de aceptación*
```gherkin
Escenario: Ver radar en el detalle de la vacante
  Dado que tengo al menos 3 skills confirmadas
  Y la vacante "Backend Engineer Node.js" está publicada
  Cuando abro el detalle de la vacante
  Entonces veo un radar de 6 a 8 ejes con el nivel requerido y mi nivel (0-5)
  Y veo mi score de match de 0 a 100 y la lista de fortalezas y brechas
  Y las skills obligatorias faltantes aparecen resaltadas

Escenario: Perfil sin skills
  Dado que no tengo skills confirmadas
  Cuando abro el detalle de una vacante
  Entonces veo solo los niveles requeridos y el llamado "Importa tu CV para ver tu match"

Escenario: Accesibilidad
  Dado que uso un lector de pantalla
  Entonces la gráfica tiene un resumen anunciado y una tabla alternativa con los mismos datos
```
*Prioridad:* Must · *Estimación:* 8 pts · *Notas:* no se usan atributos protegidos en el cálculo.

**Historia de Usuario 2 · Dashboard de postulaciones con stepper**

**Como** candidato con varias postulaciones activas **quiero** ver en un dashboard el avance de cada una en un stepper **para** saber en qué etapa estoy sin preguntar al reclutador.

*Criterios de aceptación*
```gherkin
Escenario: Ver postulaciones
  Dado que postulé a 4 vacantes
  Cuando entro a "Mis postulaciones"
  Entonces veo 4 tarjetas con empresa, vacante, fecha y score
  Y cada una muestra un stepper con Postulado, En revisión, Preseleccionado, Entrevista, Oferta y Contratado
  Y la etapa actual está resaltada con la fecha del último cambio

Escenario: Actualización en tiempo real
  Dado que tengo el dashboard abierto
  Cuando el reclutador cambia mi postulación a "Preseleccionado"
  Entonces el stepper se actualiza en menos de 5 segundos sin recargar y recibo una notificación

Escenario: Estado final negativo
  Dado que mi postulación fue marcada "No seleccionado"
  Entonces el stepper muestra el último paso alcanzado y el estado final con el mensaje del reclutador
```
*Prioridad:* Must · *Estimación:* 5 pts · *Notas:* una sola llamada `GET /v1/bff/candidate/dashboard`, actualización por WebSocket.

**Historia de Usuario 3 · Importar vacantes desde CSV o PDF**

**Como** reclutador de una agencia **quiero** subir un CSV o un PDF con una o varias vacantes **para** publicarlas todas sin capturarlas una por una.

*Criterios de aceptación*
```gherkin
Escenario: CSV válido con 3 vacantes
  Dado que tengo 3 créditos disponibles
  Cuando subo un CSV con 3 filas válidas
  Entonces veo una vista previa con las 3 vacantes y "Costo: 3 créditos"
  Cuando confirmo
  Entonces las 3 vacantes quedan publicadas y recibo un email con el resumen

Escenario: Filas con errores
  Cuando subo un CSV con 10 filas y 2 inválidas
  Entonces veo los errores por celda y puedo corregirlos o importar solo las 8 válidas

Escenario: PDF con varias vacantes
  Cuando subo un PDF que contiene 4 vacantes
  Entonces el sistema detecta 4 vacantes con su nivel de confianza
  Y las de confianza menor a 0.8 quedan marcadas "Revisar" antes de publicarse

Escenario: Créditos insuficientes
  Dado que tengo 1 crédito
  Cuando confirmo 3 vacantes
  Entonces se me ofrece pagar 2 vacantes con tarjeta o guardarlas como borrador

Escenario: Reimportación
  Cuando vuelvo a subir el mismo archivo con los mismos externalId
  Entonces las vacantes se actualizan y no se duplican
```
*Prioridad:* Must · *Estimación:* 13 pts (dividida en CSV y PDF).

Backlog completo en [docs/13-historias-usuario.md](docs/13-historias-usuario.md).

---

## 6. Tickets de Trabajo

**Ticket 1 · [Backend] TK-BE-012 · Endpoint de match con datos de radar**

| Campo | Valor |
|---|---|
| Repos | `nexo-ai-svc`, `nexo-bff-web` |
| Historia | HU-01 |
| Change OpenSpec | `add-job-match-radar` |
| Estimación | 5 pts |

*Descripción:* exponer `GET /v1/jobs/{jobId}/match` (BFF, toma el candidato del JWT) y `GET /internal/v1/match` (ai-svc) que devuelven score, radar, fortalezas, brechas y explicación.

*Alcance técnico*
1. Caso de uso `ComputeJobMatch` con puertos `SkillReadModel`, `EmbeddingRepo`, `MatchCache`, `Clock`.
2. Fórmula: `0.45·cobertura_skills + 0.30·similitud_coseno + 0.15·ajuste_seniority + 0.10·preferencias − penalización_must_have`.
3. Agrupación por categorías en 6–8 ejes (`required` y `candidate` 0–5); solo skills `confirmed`.
4. Persistencia en `ai.match_score` y caché Redis `match:{candidateId}:{jobId}` (TTL 24 h), invalidada por `job.updated` y `candidate.profile_updated`.
5. `ETag` = hash(`model_version`, `computed_at`), respuesta `304` cuando aplica.
6. Métricas OTel `match_compute_duration_ms` y `match_cache_hit_ratio`.

*Criterios de aceptación*
- [ ] Respuesta conforme al schema `JobMatch` (test de contrato Pact).
- [ ] p95 < 80 ms con caché y < 250 ms sin caché a 50 RPS (k6).
- [ ] Candidato sin skills → `score: 0` sin error; vacante no publicada → `404`.
- [ ] Atributos protegidos nunca se leen (test explícito).

*Pruebas:* unit (fórmula, must-have faltante, pesos, radar), integración (Postgres + pgvector + Redis en Testcontainers), contrato, eval de precision@10 sin regresión.
*Definición de terminado:* TDD evidenciado, cobertura de dominio ≥ 80 %, OpenAPI actualizado en `nexo-specs`, revisión adversarial sin BLOCKER.
*Dependencias:* Ticket 3.

**Ticket 2 · [Frontend] TK-FE-021 · `SkillRadarChart` y `ApplicationStepper`**

| Campo | Valor |
|---|---|
| Repos | `nexo-ui` → `nexo-web` |
| Historias | HU-01, HU-02 |
| Change OpenSpec | `add-radar-and-stepper-components` |
| Estimación | 8 pts |

*Descripción:* crear los dos componentes en el design system y usarlos en el detalle de vacante y el dashboard del candidato.

*Alcance técnico*
1. `SkillRadarChart` (Recharts, carga *lazy*): props `data`, `compare` (hasta 3 candidatos), `showLegend`, `ariaLabel`; vacante con línea discontinua `--nx-primary-2`, candidato con área `--nx-primary` al 35 %; tooltip por eje; tabla alternativa `sr-only`; animación desactivada con `prefers-reduced-motion`.
2. `ApplicationStepper`: props `steps`, `current`, `terminal` (`rejected`, `withdrawn`, `hired`), `orientation` (`auto` cambia a vertical en móvil); estados `done`, `current` (pulso con gradiente IA), `upcoming`, `terminal-negative`; `aria-current="step"`.
3. Integración en `nexo-web` con TanStack Query e invalidación por WebSocket.

*Criterios de aceptación*
- [ ] Stories: vacío, 6 ejes, 8 ejes, comparación de 3, claro/oscuro, móvil.
- [ ] Interaction tests de tooltip y cambio de paso.
- [ ] 0 violaciones axe serias o críticas.
- [ ] Snapshots visuales aprobados en 4 combinaciones de tema × viewport.
- [ ] < 60 KB gzip adicionales en la ruta de detalle.
- [ ] `@nexo/ui` publicado con versión *minor* y consumido por `nexo-web`.

*Pruebas:* Vitest (transformación de datos), Storybook interaction + a11y, Playwright visual, E2E de HU-01/HU-02 con MSW.
*Definición de terminado:* documentación MDX, solo tokens (sin colores fijos), CHANGELOG, revisión adversarial.

**Ticket 3 · [Base de datos] TK-DB-007 · Esquema de matching con pgvector**

| Campo | Valor |
|---|---|
| Repos | `nexo-ai-svc`, `nexo-jobs-svc`, `nexo-candidates-svc` |
| Historias | HU-01, auto-apply |
| Change OpenSpec | `add-vector-matching-schema` |
| Estimación | 5 pts |

*Descripción:* habilitar búsqueda vectorial eficiente y segura para matching y RAG.

*Alcance técnico*
1. Extensión `vector` (≥ 0.8) en Aurora.
2. Columnas `embedding vector(1024)` en `jobs.job` y `candidates.candidate`; taxonomía `matching.skill`; tabla `matching.match_score`. (`rag_chunks` se aplaza a v2.)
3. Índices:
   ```sql
   CREATE INDEX CONCURRENTLY job_embedding_hnsw ON jobs.job
     USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
     WHERE status = 'published';
   CREATE INDEX job_filter_idx ON jobs.job (status, country, modality);
   CREATE INDEX job_fts_idx ON jobs.job USING gin (to_tsvector('spanish', title || ' ' || description));
   ```
4. Aislamiento por organización en consultas del empleador (RLS en v2).
5. Migraciones Drizzle solo *expand* y reversibles; seed sintético de 2,000 vacantes y 5,000 candidatos con embeddings.

*Criterios de aceptación*
- [ ] `EXPLAIN ANALYZE` muestra uso del índice HNSW con filtros (`hnsw.iterative_scan`).
- [ ] p95 < 50 ms para top-200 con 100k vacantes sintéticas.
- [ ] Recall@200 ≥ 0.95 frente a búsqueda exacta.
- [ ] RLS impide leer chunks de otro tenant.
- [ ] La migración aplica y revierte sin errores.

*Pruebas:* integración con Testcontainers (`pgvector/pgvector:pg16`), benchmark `bench/vector.ts`, prueba de RLS.
*Definición de terminado:* diagrama ER actualizado, runbook de reindexado, revisión adversarial de bloqueos.

Detalle de los tickets en [docs/14-tickets-trabajo.md](docs/14-tickets-trabajo.md).

## 7. Pull Requests

> Documenta 3 de las Pull Requests realizadas durante la ejecución del proyecto

**Pull Request 1**

**Pull Request 2**

**Pull Request 3**
