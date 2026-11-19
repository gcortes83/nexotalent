# Capacidad: applications-pipeline

## Purpose
Postular a vacantes, seguir el avance con un stepper y permitir al reclutador mover el estatus de forma segura.

## Requirements

### Requirement: Postulación única
Una candidata SHALL poder postular a una vacante publicada una sola vez (`UNIQUE(job, candidate)`); el segundo intento responde `409`.
Al postular, el contador `applicantsCount` de la vacante SHALL incrementarse.

### Requirement: Máquina de estados
Estados: `submitted → in_review → shortlisted → interview_scheduled → interview_done → offer → hired`, con salidas a `rejected`
(reclutador) y `withdrawn` (solo la candidata). `interview_scheduled → shortlisted` representa una entrevista cancelada.
Los estados terminales (`hired`, `rejected`, `withdrawn`) no tienen salida. Las automatizaciones MUST NOT pasar a `rejected` ni `hired`.

#### Scenario: Transición inválida
- **GIVEN** una postulación en `shortlisted`
- **WHEN** el reclutador intenta pasarla a `hired`
- **THEN** recibe `409` con `details: {from, to}`

#### Scenario: Concurrencia optimista
- **GIVEN** una postulación en la versión 3
- **WHEN** el reclutador envía `PATCH …/status` con `If-Match: "1"`
- **THEN** recibe `412`; sin `If-Match` recibe `428`

#### Scenario: Aislamiento por organización
- **GIVEN** un reclutador de la organización A
- **WHEN** intenta leer o cambiar una postulación de la organización B
- **THEN** recibe `404`

### Requirement: Entrevista agendada en el MVP
En el MVP el reclutador SHALL fijar `interview_scheduled` manualmente (enlace de agenda fijo). En v2 el webhook de Calendly
la fijará automáticamente con el actor `system` (ver docs/04 §5).

### Requirement: Dashboard del candidato
`GET /v1/bff/candidate/dashboard` SHALL devolver en una sola llamada las postulaciones con su stepper
(`steps[]` con `done|current|upcoming` y fechas, `terminal`) y hasta 3 vacantes recomendadas por match.

### Requirement: Postulaciones estancadas
`GET /v1/bff/employer/dashboard` SHALL listar las postulaciones activas sin cambio en 3 o más días (`warning`) y 5 o más (`escalated`).
Las notificaciones por email, Slack o Teams son v2.
