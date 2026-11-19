# android-prompts.md · NexoTalent AI (Fase 2)

Prompts para construir la app nativa **Android** de NexoTalent AI en el repo `nexo-android`. Asume que el núcleo web y los endpoints móviles ya existen (ver `prompts.md` P7.3).

**Leyenda:** 🧭 modo plan · 🛡️ revisión adversarial (Prompt R de `prompts.md`) · 🧪 TDD.


> ## ⏸️ ESTADO: PENDIENTE · implementación y pruebas de Android
> Fecha: 17 de noviembre de 2026. Siguiendo el feedback de la primera entrega, las apps móviles quedan **fuera del núcleo MVP**
> y **no se han ejecutado** estos prompts: no existe código ni pruebas de `nexo-android`. Se retomarán en la fase 2 (change OpenSpec
> `openspec/changes/add-mobile-support`, estado PENDIENTE).
>
> **Prerrequisitos antes de ejecutar este archivo:** núcleo web en producción (`add-core-mvp` archivado), Cognito con PKCE
> en lugar del login de demo, endpoints móviles (registro de dispositivo, payloads reducidos, deep links) y push (FCM/APNs).
>
> | Fase | Implementación | Pruebas |
> |---|---|---|
> | A1 | ⏸️ Pendiente | ⏸️ Pendiente |
> | A2 | ⏸️ Pendiente | ⏸️ Pendiente |
> | A3 | ⏸️ Pendiente | ⏸️ Pendiente |
> | A4 | ⏸️ Pendiente | ⏸️ Pendiente |

---

## Prompt A0 · Brief Android (contexto reutilizable)

```text
Eres un ingeniero Android senior en NexoTalent AI (plataforma de reclutamiento AI-native). Lee
../nexo-specs/docs (sobre todo 01, 03, 05, 07 y 08) y ../nexo-specs/api/bff-mobile.openapi.yaml.

Stack obligatorio:
- Kotlin 2.x, Jetpack Compose, Material 3 con tema propio basado en los tokens de nexo-ui
  (dark-first, gradiente IA violeta→cian, Geist o fuente equivalente), min SDK 26, target SDK más reciente.
- Arquitectura: Clean Architecture + MVVM/MVI por feature, módulos Gradle (app, core:designsystem,
  core:network, core:data, core:database, core:auth, core:notifications, core:testing,
  feature:onboarding, feature:resume, feature:jobs, feature:applications, feature:interviews,
  feature:notifications, feature:employer, feature:settings).
- DI con Hilt; corrutinas + Flow; Navigation Compose type-safe; Kotlinx Serialization.
- Red: Retrofit u OkHttp + Ktor client generado desde OpenAPI, ETag/If-None-Match, caché HTTP,
  interceptores de auth y correlation id, manejo RFC 9457.
- Offline-first: Room como fuente de verdad para postulaciones, entrevistas y notificaciones;
  WorkManager para sincronización y subida de CV.
- Auth: Amazon Cognito (Amplify Android o AppAuth OIDC) con Credential Manager y login con Google.
- Push: Firebase Cloud Messaging; registrar token en POST /v1/devices.
- Testing: JUnit5, MockK, Turbine, Compose UI tests, Roborazzi (screenshots), Maestro (E2E).
- Calidad: ktlint, detekt, Android Lint, R8, Baseline Profiles.
Reglas: TDD en ViewModels y casos de uso, accesibilidad (TalkBack, contentDescription, tamaño de
fuente dinámico, contraste AA), sin PII en logs, datos sintéticos en tests, sin secretos en el repo.
Idioma de UI: español (México) e inglés.
```

---

## FASE A1 · Fundaciones · ⏸️ PENDIENTE

### A1.1 · Proyecto y harness 🧭
```text
[A0]
1. Crea el proyecto multi-módulo descrito en A0 con version catalog (libs.versions.toml), convention
   plugins en build-logic, flavors dev/staging/prod con baseUrl y IDs de Cognito por flavor
   (desde gradle.properties locales no versionados).
2. Agrega AGENTS.md (desde ../nexo-harness/templates, adaptado a Android) con comandos:
   ./gradlew testDevDebugUnitTest, connectedCheck, ktlintCheck, detekt, verifyRoborazziDevDebug.
3. Configura .claude/settings.json con hooks: bloquear edición de keystores, google-services.json
   real y local.properties; correr ktlint y tests del módulo afectado tras cada edición.
4. CI de GitHub Actions: build, lint, unit, screenshots, instrumented tests en emulador
   (gradle managed devices), artefacto APK/AAB de staging.
```

### A1.2 · Design system Android 🧪 🛡️
📁 `core:designsystem`
```text
[A0]
Porta los tokens de nexo-ui a Compose: NexoTheme (colores dark/light, tipografía, shapes, espaciado),
AuroraBackground animado (respeta "remove animations" del sistema), AIBadge ✦, AIShimmer,
AIStreamText (render incremental de tokens SSE), AIGlowBorder, NexoButton, NexoTextField,
NexoCard (glass opcional), Chip de skill con nivel, MatchScoreRing (Canvas animado 0-100),
SkillRadarChart (Canvas propio: 6-8 ejes, polígono requerido con línea discontinua y polígono
candidato con relleno semitransparente, etiquetas, toque en eje muestra tooltip, semantics con
descripción completa para TalkBack), ApplicationStepper (horizontal y vertical, estados done/
current/upcoming/terminal), JobCard (posiciones disponibles de totales, postulantes, score),
KPIStatCard, EmptyState, ErrorState.
Para cada componente: @Preview en claro/oscuro y tamaños de fuente, test de Roborazzi y test de
semantics. Galería de componentes en una app de catálogo (debug).
```

### A1.3 · Red, auth y datos 🧪
📁 `core:network`, `core:auth`, `core:data`, `core:database`
```text
[A0]
1. Genera el cliente desde bff-mobile.openapi.yaml; interceptores: Bearer con refresh automático,
   X-Correlation-Id, Accept-Language, ETag con caché en disco.
2. Login con Cognito (email + contraseña, Google), MFA si aplica, almacenamiento seguro de tokens
   (EncryptedDataStore / Keystore), logout y borrado de datos locales.
3. Room: entidades ApplicationEntity, InterviewEntity, NotificationEntity, JobSummaryEntity,
   MatchEntity con DAOs y migraciones probadas.
4. Repositorios offline-first (NetworkBoundResource con Flow) y SyncWorker periódico + al recibir push.
5. Tests: MockWebServer para la red, Room in-memory, Turbine para Flows.
```

---

## FASE A2 · Features del candidato · ⏸️ PENDIENTE

### A2.1 · Onboarding y CV 🧪 🛡️
📁 `feature:onboarding`, `feature:resume`
```text
[A0]
- Onboarding (3 pantallas) y registro.
- Importar CV: selector de archivos (PDF/DOCX) y escáner de documentos con ML Kit Document Scanner;
  subida con URL prefirmada vía WorkManager (reintentos, progreso en notificación).
- Estado de parsing en tiempo real (polling corto o push) y pantalla de confirmación de skills:
  chips editables con slider de nivel 0-5, agregar/eliminar skills con búsqueda.
- Constructor de CV guiado de 5 pasos con sugerencias de IA en streaming (marcadas "Generado por IA ·
  revisar", aceptar/rechazar por bloque) y descarga/compartir del PDF generado.
ViewModels con TDD (estados: idle, uploading, parsing, review, error).
```

### A2.2 · Explorar vacantes y detalle con radar 🧪
📁 `feature:jobs`
```text
[A0]
- Búsqueda semántica con debounce, filtros (modalidad, ubicación, salario) en bottom sheet y lista
  paginada con Paging 3 (cursor).
- Detalle de vacante usando GET /v1/bff/jobs/{id}/detail (una sola llamada): descripción,
  SkillRadarChart, MatchScoreRing, fortalezas y brechas, posiciones disponibles y postulantes.
- Postular (con confirmación y nota opcional), estado "ya postulado", compartir vacante.
- Deep links https://app.nexotalent.ai/jobs/{id} (App Links verificados).
Tests de ViewModel, de UI (Compose) y screenshot del detalle.
```

### A2.3 · Dashboard de postulaciones 🧪 🛡️
📁 `feature:applications`
```text
[A0]
- Dashboard con KPIs (activas, entrevistas, ofertas), filtros por estatus y tarjetas con
  ApplicationStepper.
- Detalle de postulación: stepper vertical con fechas y notas, mensajes con el reclutador
  (lista + caja de texto, envío optimista con reintento), próxima entrevista.
- Actualización: al recibir push de cambio de estatus se refresca Room y la UI se actualiza sola.
- Pull to refresh y modo offline con banner.
- Widget de pantalla de inicio (Glance) con la próxima entrevista y la última actualización.
```

### A2.4 · Auto-apply 🧪
```text
[A0]
Pantalla de reglas de auto-apply (match mínimo, modalidades, países, salario mínimo, límite diario,
empresas excluidas) con consentimiento explícito y revocable, interruptor de pausa y bitácora de
postulaciones automáticas. Valida reglas con los mismos límites que el backend.
```

### A2.5 · Entrevistas y calendario 🧪
📁 `feature:interviews`
```text
[A0]
- Calendario (mes y agenda) de entrevistas desde GET /v1/candidates/me/interviews.
- Abrir link de Calendly en Custom Tabs para agendar o reprogramar.
- "Agregar a mi calendario" con CalendarContract (Intent de inserción) y opción de sincronización
  con Google Calendar (OAuth web del backend) o suscripción al feed ICS.
- Recordatorios locales 24 h y 1 h antes (AlarmManager exacto con permiso o notificación programada).
```

### A2.6 · Notificaciones push e in-app 🧪 🛡️
📁 `core:notifications`, `feature:notifications`
```text
[A0]
- FirebaseMessagingService: registro y rotación de token (POST /v1/devices), canales de notificación
  por tipo (postulaciones, entrevistas, mensajes, sistema), permiso POST_NOTIFICATIONS con
  explicación previa, acciones en la notificación (ver postulación, responder mensaje).
- Payloads de datos con IDs (sin PII); la app consulta el detalle al abrir.
- Centro de notificaciones con estado leído y preferencias por canal y tipo (sincronizadas con el
  backend), quiet hours.
- Deep links de cada notificación a la pantalla correcta.
Tests: parsing de payloads, enrutamiento de deep links, ViewModel de preferencias.
```

---

## FASE A3 · Modo empleador (ligero) · ⏸️ PENDIENTE

### A3.1 · Empleador móvil 🧪
📁 `feature:employer`
```text
[A0]
Para usuarios con rol recruiter/employer_admin:
- Dashboard: KPIs, vacantes con posiciones cubiertas/totales y postulantes, postulaciones estancadas
  (3/5 días) con acciones rápidas.
- Candidatos por vacante ordenados por match con radar y comparación de 2 candidatos.
- Cambiar estatus (con If-Match y manejo de 409/412), enviar mensaje, generar link de Calendly.
- Cerrar vacante (Ocupada, Cancelada, En pausa) con motivo.
- Push de recordatorios de estancamiento con acción directa.
La creación de vacantes, pagos e importaciones se mantienen en web (deep link a la web).
```

---

## FASE A4 · Calidad, seguridad y publicación · ⏸️ PENDIENTE

### A4.1 · Pruebas 🧪
```text
[A0]
1. Cobertura de unit tests ≥ 80 % en ViewModels y casos de uso.
2. Compose UI tests de los flujos: login, importar CV, ver radar, postular, ver stepper, mensajes.
3. Roborazzi para todas las pantallas en claro/oscuro, fuente 100 % y 200 %.
4. Maestro: flujos E2E contra staging con usuarios sintéticos (importar CV → postular → recibir
   cambio de estatus simulado → ver stepper actualizado).
5. Pruebas de accesibilidad con Accessibility Test Framework y revisión con TalkBack.
6. Macrobenchmark de arranque y scroll; generar Baseline Profile.
```

### A4.2 · Seguridad y privacidad 🛡️
```text
[A0]
Revisa y corrige: network security config (solo HTTPS, certificate transparency), sin logs con PII
(Timber con árbol de release vacío), almacenamiento cifrado de tokens, FLAG_SECURE en pantallas con
datos sensibles opcional, ofuscación R8, Play Integrity para endpoints sensibles, exportar/borrar
datos del usuario (ARCO) desde Ajustes, aviso de privacidad accesible, sección de Data Safety de
Google Play redactada con lo que realmente recolecta la app.
```

### A4.3 · Publicación
```text
[A0]
Configura fastlane (o Gradle Play Publisher) para subir AAB firmado a Play Console (Internal testing)
desde CI con el keystore en GitHub Secrets y Play App Signing; versionado automático; release notes
desde el CHANGELOG; Firebase Crashlytics y Performance sin PII; feature flags remotos para auto-apply
y copiloto. Genera runbooks/android-release.md en nexo-specs.
```
