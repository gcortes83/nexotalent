# Delta · web-experience (capacidad nueva)

## ADDED Requirements

### Requirement: Internacionalización ES/EN
La web SHALL ofrecer español (por defecto) e inglés con un selector al pie de la página, fijo a la derecha. La elección MUST
recordarse (`nexo.lang`), poder forzarse con `?lang=en|es` y actualizar `<html lang>`, fechas y moneda.
Los diccionarios MUST tener las mismas claves (verificado por TypeScript).

#### Scenario: Cambio de idioma
- **WHEN** la persona elige EN en el pie de la landing y navega a vacantes
- **THEN** toda la interfaz, los errores de la API y las notificaciones aparecen en inglés, y al volver se conserva EN

### Requirement: Diseño responsivo
Todas las páginas SHALL funcionar sin scroll horizontal en 360, 768 y 1280 px: menú plegable en móvil, tablas como tarjetas
y formularios en una columna con inputs de 16 px.

### Requirement: Accesibilidad del movimiento
El fondo animado de IA, el brillo de selección de vacantes y los íconos animados MUST desactivarse con `prefers-reduced-motion`.
Los radares MUST incluir una tabla alternativa accesible.

### Requirement: Sección de apps móviles
Antes del footer SHALL mostrarse la sección de descargas (App Store y Google Play con URLs provisionales) salvo en el portal del
empleador. Se oculta con un ícono ✕ (preferencia `nexo.hideApps`) y se vuelve a mostrar desde el footer.
