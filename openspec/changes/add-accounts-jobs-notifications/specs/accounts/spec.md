# Delta · accounts (capacidad nueva)

## ADDED Requirements

### Requirement: Registro de candidatos y empleadores
`POST /v1/auth/register/candidate` SHALL crear un usuario `candidate` con su perfil vacío.
`POST /v1/auth/register/employer` SHALL crear la organización y un usuario `employer_admin`.
Las contraseñas MUST guardarse con scrypt y cumplir la política de 8–128 caracteres con al menos una letra y un número.

#### Scenario: Registro exitoso
- **WHEN** una persona se registra con un correo `@example.com` nuevo y una contraseña válida
- **THEN** recibe `201` con un JWT y entra a su portal

#### Scenario: Correo repetido
- **WHEN** se registra con un correo que ya existe
- **THEN** recibe `409` con código `email-taken`

#### Scenario: Contraseña débil
- **WHEN** la contraseña no cumple la política
- **THEN** recibe `422` y no se crea la cuenta

### Requirement: Login por tipo de cuenta
`POST /v1/auth/login` SHALL autenticar por correo, contraseña y tipo de cuenta (`candidate` | `employer`).
Ante cualquier fallo MUST responder `401` uniforme, sin revelar si el correo existe.
El login de demo (`/login?demo=1`, `POST /v1/auth/demo-login`) SHALL seguir disponible solo con `DEMO_AUTH=true`.

#### Scenario: Tipo de cuenta equivocado
- **GIVEN** una cuenta de candidato
- **WHEN** inicia sesión en la pestaña de empleadores con la contraseña correcta
- **THEN** recibe `401` con el mismo mensaje que una contraseña incorrecta
