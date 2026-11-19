# Capacidad: matching

## Purpose
Calcular un score explicable candidato × vacante con datos para el radar, fortalezas y brechas.

## Requirements

### Requirement: Fórmula híbrida
El sistema SHALL calcular `score = 0.45·cobertura + 0.30·similitud + 0.15·seniority + 0.10·preferencias − penalización`,
acotado a [0, 1], donde la penalización es 0.10 por cada skill obligatoria faltante con un máximo de 0.30.

#### Scenario: Cobertura total
- **GIVEN** una candidata con todas las skills requeridas confirmadas al nivel requerido o superior
- **WHEN** consulta su match con similitud 0.8, seniority adecuada y preferencias compatibles
- **THEN** la cobertura es 1, la penalización es 0 y el score es 0.94

#### Scenario: Skill obligatoria faltante
- **GIVEN** una vacante con Node.js obligatoria y una candidata sin Node.js confirmada
- **WHEN** se calcula el match
- **THEN** `missingMustHaves` contiene "Node.js" y la penalización es 0.10

#### Scenario: Candidata sin skills
- **GIVEN** una candidata sin skills confirmadas
- **WHEN** consulta el match de una vacante publicada
- **THEN** recibe `score: 0`, el radar con `candidate = 0` en todos los ejes y una invitación a confirmar skills, sin error

### Requirement: Solo skills confirmadas y sin atributos protegidos
El sistema MUST usar únicamente skills con `confirmed = true` y MUST NOT leer género, edad, estado civil, foto, nacionalidad ni dirección.

#### Scenario: Skills propuestas por la IA no cuentan
- **GIVEN** una skill extraída del CV y aún no confirmada
- **WHEN** se calcula el match
- **THEN** se trata como faltante

#### Scenario: Atributos protegidos ignorados
- **GIVEN** dos perfiles idénticos que solo difieren en atributos protegidos
- **WHEN** se calcula el match
- **THEN** el resultado es idéntico

### Requirement: Radar y explicación
El sistema SHALL agrupar las skills por categoría en un máximo de 8 ejes (el resto en "Otros"), con promedios ponderados de 0 a 5,
y SHALL generar una explicación determinista con fortalezas, brechas y obligatorias faltantes.

### Requirement: Caché y ETag
El endpoint `GET /v1/jobs/{jobId}/match` SHALL responder con `ETag` y `304` si `If-None-Match` coincide, y la caché SHALL invalidarse al confirmar skills.
Una vacante no publicada SHALL responder `404`.
