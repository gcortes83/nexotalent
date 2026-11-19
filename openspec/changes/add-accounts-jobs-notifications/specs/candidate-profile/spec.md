# Delta · candidate-profile

## ADDED Requirements

### Requirement: Datos del perfil y CV como archivo
`PUT /v1/candidates/me` SHALL actualizar los datos profesionales. `POST /v1/candidates/me/resume/file` SHALL aceptar PDF
(validado por magic bytes), TXT o MD y proponer skills igual que el CV en texto. El CV MUST tratarse como dato no confiable.

#### Scenario: Archivo disfrazado
- **WHEN** se sube un archivo `.pdf` cuyo contenido no empieza con `%PDF`
- **THEN** recibe `422`

### Requirement: Soft skills en el perfil
El perfil SHALL mostrar las soft skills en una sección propia (en verde), separada de las técnicas, con nivel 1..5; ambas se
confirman juntas con `PUT /v1/candidates/me/skills`. Solo las soft skills confirmadas cuentan para el match.

### Requirement: Vacantes aplicadas con marcas
El perfil y el dashboard SHALL mostrar las postulaciones con las marcas «Seleccionado» (`shortlisted`, `offer`, `hired`) y
«Vacante cerrada».
