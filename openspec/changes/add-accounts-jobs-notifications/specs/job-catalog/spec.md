# Delta · job-catalog (capacidad nueva)

## ADDED Requirements

### Requirement: Búsqueda y filtros facetados
`GET /v1/jobs` SHALL aceptar texto, modalidad, seniority, país, salario mínimo (USD), skills, `urgent=true`, orden y paginación,
y devolver `items`, `total`, `page`, `pageSize` y `facets` con conteos por opción. Solo lista vacantes `published`.

#### Scenario: Solo urgentes
- **WHEN** se consulta `GET /v1/jobs?urgent=true`
- **THEN** todas las vacantes devueltas tienen `urgent = true` y la faceta muestra su conteo

#### Scenario: Estado compartible
- **WHEN** la candidata aplica filtros en la web
- **THEN** quedan en la URL y al abrir ese enlace se ve el mismo resultado

### Requirement: Detalle y postulación desde la lista
Toda la tarjeta de la lista SHALL abrir el detalle. Sin sesión, el detalle SHALL invitar a crear cuenta de candidato o iniciar
sesión y regresar a la vacante con `?next=`, aceptando solo rutas internas.

#### Scenario: Redirección abierta
- **WHEN** el parámetro es `?next=//sitio-externo.example.com`
- **THEN** se ignora y se redirige al portal por defecto

### Requirement: Moneda y descripción
Los salarios SHALL mostrarse en USD mensuales (`US$5,500`) y la descripción con secciones (Sobre el rol, Responsabilidades,
Requisitos, Deseable, Qué ofrecemos, Sobre la empresa, Proceso) renderizadas sin HTML crudo.
