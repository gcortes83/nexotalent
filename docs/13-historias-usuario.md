# 13 · Historias de usuario

Formato: *Como [rol] quiero [acción] para [beneficio]*, criterios de aceptación en Gherkin, prioridad MoSCoW y estimación en puntos (Fibonacci). Cumplen INVEST.

## 1. Backlog priorizado (épicas)

| ID | Épica | Historia | Prioridad | Pts |
|---|---|---|---|---|
| HU-01 | Matching | Ver radar de skills vacante vs. mis skills | Must | 8 |
| HU-02 | Postulaciones | Ver el stepper de estatus de cada postulación en mi dashboard | Must | 5 |
| HU-03 | Ingesta | Importar 1..N vacantes desde CSV o PDF | Must | 13 |
| HU-04 | CV | Importar mi CV y obtener mis skills | Must | 8 |
| HU-05 | CV | Construir mi CV con un asistente guiado | Should | 8 |
| HU-06 | Auto-apply | Postular automáticamente con reglas | Should | 8 |
| HU-07 | Pagos | Pagar con tarjeta para publicar vacantes | Must | 8 |
| HU-08 | Pipeline | Recibir recordatorio de postulaciones sin cambio en 3/5 días | Must | 5 |
| HU-09 | Agenda | Agendar entrevista con Calendly | Must | 8 |
| HU-10 | Agenda | Sincronizar mis entrevistas con Google Calendar | Should | 5 |
| HU-11 | Vacantes | Cerrar vacante como ocupada, cancelada o en pausa | Must | 3 |
| HU-12 | Notificaciones | Configurar canales (email, WhatsApp, push, Slack, Teams) | Should | 5 |
| HU-13 | Integraciones | Conectar SAP SuccessFactors y sincronizar estatus | Could | 13 |
| HU-14 | Admin | Administrar usuarios, vacantes y candidatos | Must | 8 |
| HU-15 | Copiloto | Preguntar en lenguaje natural sobre mis candidatos | Could | 8 |
| HU-16 | Cuentas | Registrarme como candidata o empleador y entrar con correo y contraseña | Must | 5 |
| HU-17 | Vacantes | Crear, editar, publicar y cerrar mis vacantes (soft delete) | Must | 5 |
| HU-18 | Notificaciones | Enterarme en la app y por email cuando me seleccionan o se cierra la vacante | Must | 5 |
| HU-19 | Catálogo | Buscar vacantes con filtros facetados y ver las urgentes | Must | 5 |
| HU-20 | Soft skills | Comparar mis soft skills con las de la vacante en un radar propio | Should | 3 |
| HU-21 | Idioma | Usar la plataforma en español o inglés desde cualquier dispositivo | Should | 5 |

> **Estado en el MVP web (19/11/2026).** Implementadas: HU-01, HU-02 y HU-04 (change `add-core-mvp`); HU-16 a HU-21, HU-03
> (CSV/JSON/PDF sin preview editable) y HU-11 simplificada (un solo estado `closed`, sin motivo) (change
> `add-accounts-jobs-notifications`). HU-08 solo en el dashboard (sin envío de recordatorios). El resto queda para v2;
> las apps móviles siguen PENDIENTES.

## 2. Historias detalladas

### HU-01 · Comparar mis skills con la vacante (radar)

**Como** candidata que evalúa vacantes
**quiero** ver una gráfica de radar que compare las skills que pide la vacante con las mías
**para** decidir rápido si postular y saber qué me falta.

**Criterios de aceptación**
```gherkin
Escenario: Ver radar en el detalle de la vacante
  Dado que tengo un perfil con al menos 3 skills confirmadas
  Y la vacante "Backend Engineer Node.js" está publicada
  Cuando abro el detalle de la vacante
  Entonces veo un radar con entre 6 y 8 ejes de categorías de skills
  Y cada eje muestra el nivel requerido y mi nivel en escala 0-5
  Y veo mi score de match de 0 a 100
  Y veo una lista de "fortalezas" y "brechas" con las skills obligatorias resaltadas

Escenario: Perfil sin skills
  Dado que no tengo skills confirmadas
  Cuando abro el detalle de una vacante
  Entonces veo el radar solo con los niveles requeridos
  Y un llamado a la acción "Importa tu CV para ver tu match"

Escenario: Accesibilidad
  Dado que uso un lector de pantalla
  Cuando llego a la gráfica
  Entonces se anuncia un resumen y existe una tabla alternativa con los mismos datos
```
**Notas:** datos desde `GET /v1/jobs/{id}/match` (caché 24 h, ETag). No usar atributos protegidos. **Prioridad:** Must · **Pts:** 8.

### HU-02 · Dashboard de postulaciones con stepper

**Como** candidato con varias postulaciones activas
**quiero** ver en un dashboard el avance de cada una en un stepper
**para** saber en qué etapa estoy sin preguntar al reclutador.

```gherkin
Escenario: Ver postulaciones
  Dado que postulé a 4 vacantes
  Cuando entro a "Mis postulaciones"
  Entonces veo 4 tarjetas con empresa, vacante, fecha y score
  Y cada tarjeta muestra un stepper con las etapas Postulado, En revisión, Preseleccionado, Entrevista, Oferta, Contratado
  Y la etapa actual está resaltada con la fecha del último cambio

Escenario: Actualización en tiempo real
  Dado que tengo el dashboard abierto
  Cuando el reclutador cambia mi postulación a "Preseleccionado"
  Entonces el stepper se actualiza en menos de 5 segundos sin recargar
  Y recibo una notificación in-app

Escenario: Estado terminal negativo
  Dado que mi postulación fue marcada "No seleccionado"
  Entonces el stepper muestra el último paso alcanzado y un estado final en gris con el mensaje opcional del reclutador
```
**Notas:** una sola llamada `GET /v1/bff/candidate/dashboard`; actualización por WebSocket. **Prioridad:** Must · **Pts:** 5.

### HU-03 · Importar vacantes desde CSV o PDF

**Como** reclutador de una agencia
**quiero** subir un CSV o un PDF con una o varias vacantes
**para** publicarlas todas sin capturarlas una por una.

```gherkin
Escenario: CSV válido con 3 vacantes
  Dado que tengo 3 créditos disponibles
  Cuando subo un CSV con 3 filas válidas según la plantilla
  Entonces veo una vista previa con las 3 vacantes y "Costo: 3 créditos"
  Cuando confirmo la importación
  Entonces las 3 vacantes quedan publicadas y recibo un email con el resumen

Escenario: Filas con errores
  Cuando subo un CSV con 10 filas y 2 inválidas
  Entonces veo los errores por celda en la vista previa
  Y puedo corregirlos en línea o importar solo las 8 válidas

Escenario: PDF con varias vacantes
  Cuando subo un PDF que contiene 4 vacantes
  Entonces el sistema detecta 4 vacantes con su nivel de confianza
  Y las de confianza menor a 0.8 se marcan "Revisar" antes de poder publicarse

Escenario: Créditos insuficientes
  Dado que tengo 1 crédito
  Cuando confirmo 3 vacantes
  Entonces se me ofrece pagar 2 vacantes adicionales con tarjeta o guardarlas como borrador

Escenario: Reimportación
  Cuando vuelvo a subir el mismo CSV con el mismo externalId
  Entonces las vacantes existentes se actualizan y no se duplican
```
**Prioridad:** Must · **Pts:** 13 (se divide en HU-03a CSV y HU-03b PDF).

### HU-08 · Recordatorio de postulaciones estancadas

**Como** empleador
**quiero** recibir avisos cuando una postulación lleva 3 o 5 días sin cambio
**para** no dejar a candidatos sin respuesta.

```gherkin
Escenario: Recordatorio al día 3
  Dado una postulación "En revisión" sin cambios desde hace 3 días
  Cuando corre el barrido de estancamiento
  Entonces el reclutador asignado recibe email y mensaje en Slack o Teams con botones "Cambiar estatus" y "Escribir al candidato"

Escenario: Escalamiento al día 5
  Dado la misma postulación sin cambios por 5 días
  Entonces también se notifica al administrador de la organización

Escenario: No duplicar
  Dado que ya se envió el aviso de 3 días
  Cuando el barrido corre otra vez el mismo día
  Entonces no se envía un segundo aviso
```

### HU-11 · Cerrar vacante

**Como** reclutador **quiero** cerrar una vacante como Ocupada, Cancelada o En pausa **para** reflejar su estado real y avisar a los postulantes.
```gherkin
Escenario: Marcar como ocupada
  Dado una vacante con 3 posiciones y 3 contratados
  Cuando la cierro como "Ocupada"
  Entonces su estatus es "filled", deja de aparecer en búsquedas y los postulantes activos reciben un aviso
Escenario: En pausa
  Cuando la pongo "En pausa" con motivo
  Entonces no acepta nuevas postulaciones y sus días de vigencia se congelan
```

## 3. Historias agregadas en el MVP web (change `add-accounts-jobs-notifications`, 17/11/2026)

### HU-16 · Registro y login con contraseña
**Como** candidata o empleador **quiero** crear mi cuenta y entrar con correo y contraseña **para** usar la plataforma sin cuentas de demo.
```gherkin
Escenario: Registro de empleador
  Dado que no tengo cuenta
  Cuando me registro como empleador con el nombre de mi empresa, un correo nuevo y una contraseña válida
  Entonces se crea mi organización, quedo como administrador y entro a mi dashboard
Escenario: Credenciales inválidas
  Cuando entro en la pestaña equivocada o con una contraseña incorrecta
  Entonces veo el mismo mensaje de credenciales inválidas, sin saber si el correo existe
```

### HU-17 · Gestionar e importar vacantes
**Como** reclutador **quiero** crear, editar, publicar, cerrar e importar vacantes **para** mantener mi catálogo al día.
```gherkin
Escenario: Cerrar vacante con postulantes
  Dado una vacante publicada con 2 postulaciones activas
  Cuando la cierro y confirmo
  Entonces su estatus es "closed", deja de aparecer en el catálogo y los 2 postulantes reciben un aviso
Escenario: Importar CSV con una fila inválida
  Cuando importo un CSV de 3 vacantes y una tiene una moneda distinta de USD
  Entonces se importan 2 en borrador y el reporte muestra el error de la tercera fila
```

### HU-18 · Notificaciones de selección y cierre
**Como** candidata **quiero** enterarme cuando me preseleccionan o se cierra una vacante **para** no quedarme esperando (cero ghosting).
```gherkin
Escenario: Preselección
  Cuando el reclutador me mueve a "Preseleccionado"
  Entonces veo un toast en menos de 10 segundos, la marca "Seleccionado" en mis vacantes aplicadas y recibo un email
```

### HU-19 · Catálogo con filtros
**Como** candidata **quiero** filtrar vacantes por modalidad, seniority, país, salario en USD, skills y urgencia **para** encontrar rápido las que me interesan.
```gherkin
Escenario: Compartir búsqueda
  Dado que filtro por "remoto" y "solo urgentes"
  Cuando copio la URL y la abro en otro navegador
  Entonces veo los mismos resultados y los chips de filtros activos
Escenario: Postular sin sesión
  Dado que no he iniciado sesión
  Cuando abro una vacante y elijo crear cuenta de candidata
  Entonces al terminar el registro regreso a la vacante y puedo postular
```

### HU-20 · Radar de soft skills
**Como** candidata **quiero** ver por separado el radar de skills técnicas y el de soft skills **para** entender ambas brechas.
```gherkin
Escenario: Vacante con soft skills
  Dado que la vacante pide "Comunicación" y "Trabajo en equipo"
  Y confirmé "Comunicación" en nivel 4
  Cuando abro el detalle
  Entonces veo un segundo radar en verde con un eje por soft skill y mi nivel confirmado
```

### HU-21 · Idioma y dispositivo
**Como** usuaria **quiero** cambiar entre español e inglés y usar la plataforma en el celular **para** trabajar en mi idioma desde cualquier lugar.
```gherkin
Escenario: Cambiar a inglés
  Cuando elijo "EN" en el pie de página
  Entonces toda la interfaz cambia a inglés y se conserva al volver
Escenario: Celular
  Dado una pantalla de 360 px
  Cuando navego por cualquier página
  Entonces no hay scroll horizontal y el menú se pliega
```

