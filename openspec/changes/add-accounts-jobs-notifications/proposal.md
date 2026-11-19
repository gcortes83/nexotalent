# Change: add-accounts-jobs-notifications

**Estado:** implementado · **Solicitado por:** product owner (17/11/2026), tras el núcleo `add-core-mvp`.

## Por qué
El núcleo MVP solo permitía cuentas de demo y vacantes sembradas. Para una demo creíble hace falta que candidatos y
empleadores se registren, que el empleador gestione e importe sus vacantes y que el candidato se entere de los cambios.

## Qué cambia
1. **Cuentas**: registro de candidato y de empleador (crea la organización y un `employer_admin`), login con correo y
   contraseña (scrypt) separado por tipo de cuenta. El login de demo sigue disponible en `/login?demo=1` (`DEMO_AUTH=true`).
2. **Perfil del candidato**: actualizar datos profesionales, subir CV como archivo (`.pdf`, `.txt`, `.md`) o texto, ver sus
   postulaciones con marcas «Seleccionado» y «Vacante cerrada».
3. **Gestión de vacantes**: crear (borrador o publicada; pago simulado), editar, publicar y **cerrar** (soft delete:
   `status = 'closed'`, `closed_at`; nunca se borra la fila).
4. **Importación** de vacantes en los formatos de `docs/04-integraciones.md`: **CSV** (plantilla), **JSON** (`CanonicalJob`, 1..N)
   y **PDF** (1..N vacantes separadas por `Vacante:`/`Puesto:`; skills extraídas con el extractor de IA). Upsert por
   `(organization_id, external_id)`; las importadas quedan en borrador salvo `publish=true` (PDF siempre en borrador para revisión).
5. **Notificaciones**: in-app (tabla `notifications.notification`, toasts en la web) y **email** (puerto `EmailSender`:
   `log` en desarrollo, `smtp` hacia Mailpit en Docker). Se notifica al candidato cuando lo preseleccionan, recibe oferta,
   es contratado o no seleccionado, y cuando se cierra una vacante a la que se postuló.
6. **Landing page** pública con accesos a registro de candidatos, de empleadores y a vacantes.
7. **Iteraciones de la web** (prompts C12–C18, mismo día, aprobadas por el product owner en la sesión): fondo animado de IA y
   footer, catálogo con filtros facetados, vacantes urgentes, moneda única USD, 100 vacantes con descripciones detalladas,
   soft skills con radares propios, i18n ES/EN, diseño responsivo y sección de apps móviles (solo enlaces provisionales;
   las apps siguen PENDIENTES en `add-mobile-support`).

## Fuera de alcance
Verificación de correo, recuperación de contraseña, MFA/Cognito, importación por API pull programada, Textract (PDF escaneado),
DOCX, borrado definitivo de vacantes.

## Impacto
- Migraciones expand-only `0002_accounts_jobs_notifications.sql`, `0003_job_currency_usd.sql` y `0004_job_urgent.sql`.
- OpenAPI 0.2.0: registro, login, `/v1/employer/jobs/**`, `/v1/notifications/**`, filtros y `facets` en `GET /v1/jobs`, `urgent` y `softSkills`.
- `MATCH_MODEL_VERSION` sin cambio (`match-v1`): las soft skills usan la misma fórmula y solo cuentan si están confirmadas.
- Specs delta en `specs/` y decisiones en `design.md`.
- `JobStatus` agrega `closed`. Las postulaciones de vacantes cerradas no aparecen como estancadas.
- `AGENTS.md`: registro, gestión/importación de vacantes y notificaciones salen de «fuera de alcance».
