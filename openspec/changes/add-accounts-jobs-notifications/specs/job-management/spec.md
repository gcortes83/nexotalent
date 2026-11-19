# Delta · job-management (capacidad nueva)

## ADDED Requirements

### Requirement: Crear, editar y publicar vacantes
El empleador SHALL crear vacantes en borrador o publicadas (pago simulado), editarlas en `draft`, `published` u `on_hold`
y publicarlas. Toda operación MUST limitarse a su organización (`404` para vacantes de otra organización).
Las skills y soft skills MUST existir en la taxonomía; el salario es mensual en USD.

#### Scenario: Publicar sin skills
- **WHEN** el empleador publica una vacante sin skills
- **THEN** recibe `422`

#### Scenario: Editar una vacante cerrada
- **WHEN** intenta editar una vacante en estado `closed`
- **THEN** recibe `409` con código `job-not-editable`

### Requirement: Cerrar vacante (soft delete)
`POST /v1/employer/jobs/{jobId}/close` SHALL fijar `status = 'closed'` y `closed_at` sin borrar la fila, solo desde `draft`,
`pending_payment`, `published` u `on_hold`. Las postulaciones activas MUST notificarse (capacidad notifications) y dejan de
contar como estancadas.

#### Scenario: Cerrar dos veces
- **GIVEN** una vacante ya cerrada
- **WHEN** se intenta cerrar de nuevo
- **THEN** recibe `409` con código `job-not-closable`

### Requirement: Importación 1..N
`POST /v1/employer/jobs/imports` SHALL aceptar CSV (plantilla, RFC 4180), JSON (`CanonicalJob`, objeto o arreglo) y PDF
(vacantes separadas por `Vacante:`/`Puesto:`), con un máximo de 500 vacantes por archivo, reporte por fila y upsert por
`(organization_id, external_id)`. Las vacantes importadas quedan en borrador salvo `publish=true`; las de PDF siempre en borrador.
Columnas opcionales: `urgent` y `softSkills`.

#### Scenario: Fila con otra moneda
- **WHEN** una fila del CSV declara `currency = MXN`
- **THEN** esa fila se reporta con error `422` y las demás filas válidas se importan

#### Scenario: Reimportar el mismo externalId
- **WHEN** se importa de nuevo una vacante con el mismo `externalId`
- **THEN** se actualiza la vacante existente en lugar de duplicarla

### Requirement: Vacantes urgentes
La vacante SHALL tener un indicador `urgent` editable en el formulario y en las importaciones.
