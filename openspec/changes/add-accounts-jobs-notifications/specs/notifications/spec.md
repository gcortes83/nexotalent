# Delta · notifications (capacidad nueva)

## ADDED Requirements

### Requirement: Notificar cambios relevantes a la candidata
Al cambiar el estatus de una postulación, el sistema SHALL crear una notificación in-app para la candidata con `kind`
(`selected`, `status_changed`, `job_closed`) y datos (`jobId`, `applicationId`, `status`, `jobTitle`) para que el cliente
redacte el texto en su idioma. MUST enviar además un email por el puerto `EmailSender` cuando el estatus es `shortlisted`,
`offer`, `hired` o `rejected`, y cuando se cierra la vacante a la que se postuló.

#### Scenario: Preselección
- **WHEN** el reclutador mueve la postulación a `shortlisted`
- **THEN** la candidata ve un toast «¡Fuiste preseleccionado!» en ≤ 10 s, la marca «Seleccionado» en sus vacantes aplicadas y recibe un email

#### Scenario: Vacante cerrada
- **WHEN** el empleador cierra una vacante con postulaciones activas
- **THEN** cada candidata recibe la notificación `job_closed`, un email y ve la marca «Vacante cerrada»

### Requirement: Bandeja de notificaciones
`GET /v1/notifications` SHALL listar las notificaciones del usuario autenticado; `POST /v1/notifications/{id}/read` y
`POST /v1/notifications/read-all` SHALL marcarlas como leídas. Un usuario MUST NOT leer notificaciones ajenas.
