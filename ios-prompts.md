# ios-prompts.md · NexoTalent AI (Fase 2)

Prompts para construir la app nativa **iOS** de NexoTalent AI en el repo `nexo-ios`. Asume que el núcleo web y los endpoints móviles ya existen (ver `prompts.md` P7.3).

**Leyenda:** 🧭 modo plan · 🛡️ revisión adversarial (Prompt R de `prompts.md`) · 🧪 TDD.


> ## ⏸️ ESTADO: PENDIENTE · implementación y pruebas de iOS
> Fecha: 17 de noviembre de 2026. Siguiendo el feedback de la primera entrega, las apps móviles quedan **fuera del núcleo MVP**
> y **no se han ejecutado** estos prompts: no existe código ni pruebas de `nexo-ios`. Se retomarán en la fase 2 (change OpenSpec
> `openspec/changes/add-mobile-support`, estado PENDIENTE).
>
> **Prerrequisitos antes de ejecutar este archivo:** núcleo web en producción (`add-core-mvp` archivado), Cognito con PKCE
> en lugar del login de demo, endpoints móviles (registro de dispositivo, payloads reducidos, deep links) y push (FCM/APNs).
>
> | Fase | Implementación | Pruebas |
> |---|---|---|
> | I1 | ⏸️ Pendiente | ⏸️ Pendiente |
> | I2 | ⏸️ Pendiente | ⏸️ Pendiente |
> | I3 | ⏸️ Pendiente | ⏸️ Pendiente |
> | I4 | ⏸️ Pendiente | ⏸️ Pendiente |

---

## Prompt I0 · Brief iOS (contexto reutilizable)

```text
Eres un ingeniero iOS senior en NexoTalent AI (plataforma de reclutamiento AI-native). Lee
../nexo-specs/docs (sobre todo 01, 03, 05, 07 y 08) y ../nexo-specs/api/bff-mobile.openapi.yaml.

Stack obligatorio:
- Swift 6 con strict concurrency, SwiftUI, iOS 17+ como mínimo, Observation (@Observable).
- Arquitectura modular con Swift Package Manager: App, DesignSystem, Networking, Auth, Persistence,
  Notifications, Features/{Onboarding, Resume, Jobs, Applications, Interviews, NotificationsCenter,
  Employer, Settings}, TestSupport. MVVM por feature con casos de uso y repositorios.
- Navegación con NavigationStack y router tipado; deep links y Universal Links.
- Red: cliente generado con swift-openapi-generator desde bff-mobile.openapi.yaml, URLSession con
  async/await, ETag/If-None-Match, middleware de auth, correlation id y RFC 9457.
- Persistencia offline-first con SwiftData para postulaciones, entrevistas y notificaciones;
  BackgroundTasks para sincronización y subida de CV en background URLSession.
- Auth: Amazon Cognito (Amplify Swift o AppAuth OIDC), Sign in with Apple y Google, tokens en Keychain.
- Push: APNs con registro del token en POST /v1/devices; Notification Service Extension.
- Charts: Swift Charts para KPIs; radar con Shape/Canvas propio (Swift Charts no incluye radar).
- Testing: Swift Testing, XCTest/XCUITest, swift-snapshot-testing, Maestro opcional para E2E.
- Calidad: SwiftLint, SwiftFormat.
Reglas: TDD en view models y casos de uso, accesibilidad (VoiceOver, Dynamic Type, Reduce Motion,
contraste AA), sin PII en logs (os.Logger con privacy), datos sintéticos en tests, sin secretos en el
repo. Idioma: español (México) e inglés con String Catalogs.
```

---

## FASE I1 · Fundaciones · ⏸️ PENDIENTE

### I1.1 · Proyecto y harness 🧭
```text
[I0]
1. Crea el proyecto Xcode con los paquetes SPM descritos, configuraciones Dev/Staging/Prod (xcconfig
   con baseURL e IDs de Cognito, sin secretos versionados) y esquemas por entorno.
2. AGENTS.md (desde ../nexo-harness/templates adaptado a iOS) con comandos xcodebuild test,
   swiftlint, swiftformat --lint y tests de snapshots.
3. .claude/settings.json con hooks: bloquear edición de certificados, perfiles de aprovisionamiento,
   GoogleService-Info real y .xcconfig con secretos; correr SwiftLint y tests del paquete afectado
   tras cada edición.
4. CI en GitHub Actions (runner macOS): build, lint, unit, snapshots, UI tests en simulador, artefacto
   de staging.
```

### I1.2 · Design system iOS 🧪 🛡️
📁 `DesignSystem`
```text
[I0]
Porta los tokens de nexo-ui a SwiftUI: NexoTheme (colores dark/light en Asset Catalog, tipografía con
Dynamic Type, radios, espaciado), AuroraBackground (MeshGradient animado, estático con Reduce Motion),
AIBadge ✦, AIShimmer, AIStreamText (render incremental de SSE), AIGlowBorder (AngularGradient
animado), NexoButton, NexoTextField, NexoCard con .ultraThinMaterial opcional, SkillChip con nivel,
MatchScoreRing (animado 0-100), SkillRadarChart (Shape/Canvas: 6-8 ejes, polígono requerido con trazo
discontinuo y polígono candidato con relleno semitransparente, etiquetas, selección por eje con
tooltip, accessibilityElement con resumen y accessibilityChartDescriptor), ApplicationStepper
(horizontal y vertical, estados done/current/upcoming/terminal, con .sensoryFeedback al avanzar),
JobCard (posiciones disponibles de totales, postulantes, score), KPIStatCard con Swift Charts,
EmptyState, ErrorState.
Para cada componente: #Preview en claro/oscuro y tamaños de Dynamic Type, snapshot test y prueba de
accesibilidad. App de catálogo para debug.
```

### I1.3 · Red, auth y persistencia 🧪
📁 `Networking`, `Auth`, `Persistence`
```text
[I0]
1. Genera el cliente con swift-openapi-generator; middlewares de Bearer con refresh, X-Correlation-Id,
   Accept-Language y ETag con URLCache.
2. Login con Cognito (email, Sign in with Apple, Google), MFA si aplica, tokens en Keychain con
   accesibilidad afterFirstUnlock, logout y borrado de datos locales.
3. SwiftData: modelos ApplicationRecord, InterviewRecord, NotificationRecord, JobSummaryRecord,
   MatchRecord con migraciones versionadas.
4. Repositorios offline-first con AsyncStream; sincronización con BGAppRefreshTask y al recibir push
   silencioso.
5. Tests con URLProtocol stub, contenedor SwiftData en memoria y Swift Testing.
```

---

## FASE I2 · Features del candidato · ⏸️ PENDIENTE

### I2.1 · Onboarding y CV 🧪 🛡️
📁 `Features/Onboarding`, `Features/Resume`
```text
[I0]
- Onboarding (3 pantallas) y registro.
- Importar CV: fileImporter (PDF/DOCX) y escáner con VisionKit (VNDocumentCameraViewController) que
  genera PDF; subida con background URLSession a URL prefirmada y progreso.
- Estado de parsing y confirmación de skills: chips editables con Slider 0-5, búsqueda para agregar.
- Constructor de CV guiado de 5 pasos con sugerencias de IA en streaming (marcadas "Generado por IA ·
  revisar", aceptar/rechazar por bloque), vista previa con PDFKit y ShareLink del PDF.
View models con TDD (idle, uploading, parsing, review, error).
```

### I2.2 · Explorar vacantes y detalle con radar 🧪
📁 `Features/Jobs`
```text
[I0]
- Búsqueda semántica (.searchable con debounce), filtros en sheet, lista paginada por cursor.
- Detalle con GET /v1/bff/jobs/{id}/detail (una sola llamada): descripción, SkillRadarChart,
  MatchScoreRing, fortalezas y brechas, posiciones disponibles y postulantes.
- Postular con confirmación y nota opcional; estado "ya postulado"; ShareLink de la vacante.
- Universal Links https://app.nexotalent.ai/jobs/{id} (apple-app-site-association en el backend).
- Spotlight (CoreSpotlight) para vacantes guardadas y App Intents "Ver mis postulaciones".
Tests de view model, snapshots del detalle y XCUITest del flujo de postulación.
```

### I2.3 · Dashboard de postulaciones 🧪 🛡️
📁 `Features/Applications`
```text
[I0]
- Dashboard con KPIs, filtros por estatus y tarjetas con ApplicationStepper.
- Detalle: stepper vertical con fechas y notas, mensajes con el reclutador (envío optimista con
  reintento), próxima entrevista.
- Actualización automática al recibir push de cambio de estatus.
- .refreshable, banner offline.
- Widget (WidgetKit) con la próxima entrevista y la última actualización de estatus.
- Live Activity (ActivityKit) el día de la entrevista con cuenta regresiva y link.
```

### I2.4 · Auto-apply 🧪
```text
[I0]
Pantalla de reglas de auto-apply (match mínimo, modalidades, países, salario mínimo, límite diario,
empresas excluidas) con consentimiento explícito y revocable, interruptor de pausa y bitácora de
postulaciones automáticas. Validación alineada con los límites del backend.
```

### I2.5 · Entrevistas y calendario 🧪
📁 `Features/Interviews`
```text
[I0]
- Calendario (mes y agenda) de entrevistas desde GET /v1/candidates/me/interviews.
- Abrir el link de Calendly en SFSafariViewController para agendar o reprogramar.
- "Agregar a mi calendario" con EventKit (EKEventEditViewController, permiso de solo escritura) y
  opción de sincronizar con Google Calendar (OAuth web del backend) o suscribirse al feed ICS
  (webcal://).
- Notificaciones locales 24 h y 1 h antes con UNUserNotificationCenter.
```

### I2.6 · Notificaciones push e in-app 🧪 🛡️
📁 `Notifications`, `Features/NotificationsCenter`
```text
[I0]
- Registro APNs y envío del token a POST /v1/devices (y al rotar), solicitud de permiso con pantalla
  previa explicativa, categorías con acciones (ver postulación, responder mensaje con
  UNTextInputNotificationAction), Notification Service Extension para enriquecer el contenido
  consultando el BFF con un token de corta duración (el payload solo trae IDs, sin PII),
  interruption levels (timeSensitive para entrevistas próximas).
- Centro de notificaciones con estado leído y preferencias por canal y tipo sincronizadas con el
  backend, quiet hours.
- Enrutamiento de deep links desde cada notificación.
Tests: decodificación de payloads, router de deep links, view model de preferencias.
```

---

## FASE I3 · Modo empleador (ligero) · ⏸️ PENDIENTE

### I3.1 · Empleador móvil 🧪
📁 `Features/Employer`
```text
[I0]
Para usuarios recruiter/employer_admin:
- Dashboard con KPIs (Swift Charts), vacantes con posiciones cubiertas/totales y postulantes,
  postulaciones estancadas 3/5 días con acciones rápidas.
- Candidatos por vacante ordenados por match con radar y comparación de 2 candidatos.
- Cambiar estatus (If-Match, manejo de 409/412), enviar mensaje, generar link de Calendly.
- Cerrar vacante (Ocupada, Cancelada, En pausa) con motivo.
- Push de recordatorios de estancamiento con acción directa.
Creación de vacantes, pagos e importaciones se hacen en web (Universal Link a la web).
```

---

## FASE I4 · Calidad, seguridad y publicación · ⏸️ PENDIENTE

### I4.1 · Pruebas 🧪
```text
[I0]
1. Cobertura ≥ 80 % en view models y casos de uso con Swift Testing.
2. XCUITest: login, importar CV, ver radar, postular, ver stepper, mensajes.
3. Snapshots de todas las pantallas en claro/oscuro y Dynamic Type L y AX3.
4. E2E contra staging con usuarios sintéticos (Maestro o XCUITest) incluyendo cambio de estatus
   simulado y actualización del stepper.
5. Auditoría de accesibilidad con XCUIApplication.performAccessibilityAudit() y revisión manual con
   VoiceOver.
6. Medición de arranque y hitches con XCTMetric e Instruments.
```

### I4.2 · Seguridad y privacidad 🛡️
```text
[I0]
Revisa y corrige: App Transport Security estricto, Keychain para tokens, sin PII en logs
(os.Logger con .private), protección de datos de archivos (NSFileProtectionComplete), App Attest
para endpoints sensibles, exportar y borrar datos (ARCO) desde Ajustes, aviso de privacidad,
Privacy Manifest (PrivacyInfo.xcprivacy) con las APIs y datos realmente usados y etiquetas de
privacidad del App Store coherentes, App Tracking Transparency solo si se rastrea (por defecto no).
```

### I4.3 · Publicación
```text
[I0]
Configura fastlane (match para certificados en repositorio privado cifrado, gym, pilot) para subir a
TestFlight desde CI; versionado automático; release notes desde el CHANGELOG; Crashlytics o
MetricKit sin PII; feature flags remotos para auto-apply y copiloto. Genera
runbooks/ios-release.md en nexo-specs con el checklist de App Review (cuenta demo sintética,
explicación del uso de IA y de las notificaciones).
```
