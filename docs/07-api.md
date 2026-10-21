# 07 · Especificación de la API

Convenciones: REST JSON, versionado en ruta (`/v1`), auth `Bearer` JWT de Cognito (usuarios) o API key/OAuth client credentials (integraciones), errores **RFC 9457 Problem Details**, paginación por cursor (`?cursor=&limit=`), `Idempotency-Key` en POST con efectos, `ETag`/`If-None-Match` en lecturas, `X-Correlation-Id` propagado.

## 1. Catálogo (BFF web)

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/v1/bff/candidate/dashboard` | Postulaciones + stepper + próximas entrevistas + vacantes recomendadas (1 llamada) | candidate |
| GET | `/v1/jobs` | Búsqueda (texto/semántica, filtros) | público |
| GET | `/v1/jobs/{jobId}` | Detalle con `positionsTotal`, `positionsAvailable`, `applicantsCount` | público |
| GET | `/v1/jobs/{jobId}/match` | Score + datos de radar del candidato autenticado | candidate |
| POST | `/v1/jobs/{jobId}/applications` | Postular | candidate |
| PUT | `/v1/candidates/me/auto-apply-rule` | Configurar auto-apply | candidate |
| POST | `/v1/candidates/me/resumes` | URL prefirmada para subir CV | candidate |
| GET | `/v1/candidates/me/interviews` | Calendario de entrevistas | candidate |
| GET | `/v1/bff/employer/dashboard` | KPIs, vacantes, postulaciones estancadas | recruiter |
| POST | `/v1/jobs` | Crear vacante | recruiter |
| POST | `/v1/jobs/imports` | Importar 1..N vacantes | recruiter / integración |
| POST | `/v1/jobs/{jobId}/close` | Cerrar: `filled`, `cancelled`, `on_hold` | recruiter |
| GET | `/v1/jobs/{jobId}/applications` | Candidatos ordenados por match | recruiter |
| PATCH | `/v1/applications/{id}/status` | Cambiar estatus | recruiter |
| POST | `/v1/applications/{id}/messages` | Mensaje al candidato | recruiter, candidate |
| POST | `/v1/applications/{id}/interviews/scheduling-link` | Link Calendly | recruiter |
| POST | `/v1/billing/checkout-sessions` | Stripe Checkout | employer_admin |
| POST | `/v1/integrations/connections` | Registrar conector / endpoint | employer_admin |
| POST | `/v1/devices` | Registrar token push | autenticado |
| GET/POST/PATCH/DELETE | `/v1/admin/{users,organizations,jobs,candidates}` | Administración | platform_admin |
| POST | `/webhooks/{stripe,calendly,slack}` | Webhooks firmados | externo |

## 2. Endpoints principales (OpenAPI 3.1)

```yaml
openapi: 3.1.0
info:
  title: NexoTalent AI API
  version: 1.0.0
servers:
  - url: https://api.nexotalent.ai
security:
  - bearerAuth: []
paths:
  /v1/jobs/imports:
    post:
      operationId: createJobImport
      summary: Importa 1..N vacantes (JSON); CSV/PDF usan uploadUrl
      tags: [Jobs]
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema: { type: string, maxLength: 64 }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/JsonImportRequest'
                - $ref: '#/components/schemas/FileImportRequest'
      responses:
        '202':
          description: Importación aceptada
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ImportBatch' }
        '400': { $ref: '#/components/responses/Problem' }
        '402': { $ref: '#/components/responses/Problem' }
        '409': { $ref: '#/components/responses/Problem' }

  /v1/jobs/{jobId}/match:
    get:
      operationId: getJobMatch
      summary: Score de match y datos de radar del candidato autenticado
      tags: [Matching]
      parameters:
        - in: path
          name: jobId
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Match calculado
          headers:
            ETag: { schema: { type: string } }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/JobMatch' }
        '304': { description: Sin cambios }
        '404': { $ref: '#/components/responses/Problem' }

  /v1/applications/{applicationId}/status:
    patch:
      operationId: updateApplicationStatus
      summary: Cambia el estatus de una postulación
      tags: [Applications]
      parameters:
        - in: path
          name: applicationId
          required: true
          schema: { type: string }
        - in: header
          name: If-Match
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { $ref: '#/components/schemas/ApplicationStatus' }
                reason: { type: string, maxLength: 500 }
                notifyCandidate: { type: boolean, default: true }
                message: { type: string, maxLength: 4000 }
      responses:
        '200':
          description: Estatus actualizado
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Application' }
        '409': { $ref: '#/components/responses/Problem' }
        '412': { $ref: '#/components/responses/Problem' }
        '422': { $ref: '#/components/responses/Problem' }

components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  responses:
    Problem:
      description: Error RFC 9457
      content:
        application/problem+json:
          schema:
            type: object
            properties:
              type: { type: string, format: uri }
              title: { type: string }
              status: { type: integer }
              detail: { type: string }
              errors: { type: array, items: { type: object } }
  schemas:
    ApplicationStatus:
      type: string
      enum: [submitted, in_review, shortlisted, interview_scheduled, interview_done, offer, hired, rejected, withdrawn]
    CanonicalJob:
      type: object
      required: [title, description, positions, location]
      properties:
        externalId: { type: string }
        title: { type: string, maxLength: 160 }
        description: { type: string }
        positions: { type: integer, minimum: 1 }
        location:
          type: object
          properties:
            country: { type: string }
            city: { type: string }
            modality: { type: string, enum: [onsite, hybrid, remote] }
        salary:
          type: object
          properties:
            min: { type: number }
            max: { type: number }
            currency: { type: string }
        skills:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              level: { type: integer, minimum: 0, maximum: 5 }
              mustHave: { type: boolean }
    JsonImportRequest:
      type: object
      required: [jobs]
      properties:
        publishMode: { type: string, enum: [draft, publish], default: draft }
        jobs:
          type: array
          minItems: 1
          maxItems: 1000
          items: { $ref: '#/components/schemas/CanonicalJob' }
    FileImportRequest:
      type: object
      required: [fileType, s3Key]
      properties:
        fileType: { type: string, enum: [csv, pdf] }
        s3Key: { type: string }
        publishMode: { type: string, enum: [draft, publish], default: draft }
    ImportBatch:
      type: object
      properties:
        importId: { type: string }
        status: { type: string, enum: [uploaded, parsing, validated, awaiting_confirmation, importing, completed, partially_failed, failed] }
        totalItems: { type: integer }
        creditsRequired: { type: integer }
        links:
          type: object
          properties:
            self: { type: string }
            preview: { type: string }
    JobMatch:
      type: object
      properties:
        jobId: { type: string }
        score: { type: number, minimum: 0, maximum: 100 }
        radar:
          type: array
          items:
            type: object
            properties:
              axis: { type: string }
              required: { type: number }
              candidate: { type: number }
        strengths: { type: array, items: { type: string } }
        gaps:
          type: array
          items:
            type: object
            properties:
              skill: { type: string }
              requiredLevel: { type: integer }
              currentLevel: { type: integer }
              mustHave: { type: boolean }
        explanation: { type: string }
        modelVersion: { type: string }
    Application:
      type: object
      properties:
        id: { type: string }
        jobId: { type: string }
        candidateId: { type: string }
        status: { $ref: '#/components/schemas/ApplicationStatus' }
        matchScore: { type: number }
        statusChangedAt: { type: string, format: date-time }
        version: { type: integer }
```

## 3. Ejemplos

**`POST /v1/jobs/imports`**
```http
POST /v1/jobs/imports
Authorization: Bearer eyJ...
Idempotency-Key: 7f9c2a10-imp-001
Content-Type: application/json

{ "publishMode": "draft",
  "jobs": [
    { "externalId": "REQ-42", "title": "Backend Engineer Node.js", "description": "...", "positions": 3,
      "location": { "country": "MX", "city": "CDMX", "modality": "hybrid" },
      "skills": [{ "name": "Node.js", "level": 4, "mustHave": true }, { "name": "PostgreSQL", "level": 3 }] },
    { "externalId": "REQ-43", "title": "React Developer", "description": "...", "positions": 1,
      "location": { "country": "MX", "modality": "remote" } }
  ] }
```
```json
{ "importId": "imp_01JB8...", "status": "validated", "totalItems": 2, "creditsRequired": 2,
  "links": { "self": "/v1/jobs/imports/imp_01JB8...", "preview": "/v1/jobs/imports/imp_01JB8.../items" } }
```

**`GET /v1/jobs/job_01JB.../match`**
```json
{ "jobId": "job_01JB...", "score": 82.4,
  "radar": [
    { "axis": "Lenguajes", "required": 4, "candidate": 4.5 },
    { "axis": "Frameworks", "required": 4, "candidate": 3 },
    { "axis": "Cloud", "required": 3, "candidate": 2 },
    { "axis": "Datos", "required": 3, "candidate": 4 },
    { "axis": "Soft skills", "required": 3, "candidate": 4 },
    { "axis": "Idiomas", "required": 3, "candidate": 3 } ],
  "strengths": ["Node.js", "PostgreSQL", "Comunicación"],
  "gaps": [{ "skill": "AWS Lambda", "requiredLevel": 3, "currentLevel": 1, "mustHave": false }],
  "explanation": "Cubres el 100 % de las skills obligatorias; tu mayor brecha está en Cloud.",
  "modelVersion": "match-v1.3" }
```

**`PATCH /v1/applications/app_01JB.../status`**
```http
PATCH /v1/applications/app_01JB.../status
If-Match: "7"
Content-Type: application/json

{ "status": "shortlisted", "notifyCandidate": true, "message": "¡Hola Ana! Nos gustó tu perfil." }
```
`200` con la postulación (`version: 8`). `409` si la transición no es válida (p. ej. `hired → in_review`), `412` si la versión cambió (concurrencia optimista), `422` si la vacante está `on_hold`/cerrada.
