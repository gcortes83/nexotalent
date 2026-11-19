# Change: add-mobile-support · ESTADO: PENDIENTE

> ⏸️ **Pendiente.** La implementación y las pruebas de las apps nativas **iOS** (`ios-prompts.md`) y **Android**
> (`android-prompts.md`) quedan fuera del núcleo MVP web y se retomarán en la fase 2, después de la entrega final.

## Why
Las apps nativas requieren auth móvil, push (FCM/APNs), deep links y un BFF móvil, que no existen en el núcleo.

> **Nota (19/11/2026):** la web ya muestra la sección «Sigue tu proceso desde el celular» con enlaces **provisionales** a App
> Store y Google Play (`apps/web/src/site.ts`, prompt C18). Al publicar las apps hay que sustituir esas URLs.

## Prerrequisitos antes de empezar
- Núcleo web estable en producción (`add-core-mvp` archivado).
- Cognito con PKCE en lugar del login de demo.
- Endpoints móviles: registro de dispositivo, payloads reducidos y deep links.

## Tasks
- [ ] Android: implementación (Kotlin + Compose) · PENDIENTE
- [ ] Android: pruebas (unit, Compose UI, Maestro) · PENDIENTE
- [ ] iOS: implementación (Swift + SwiftUI) · PENDIENTE
- [ ] iOS: pruebas (XCTest, Swift Testing, XCUITest) · PENDIENTE
