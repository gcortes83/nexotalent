# Diseño · add-accounts-jobs-notifications

**Estado:** implementado (17/11/2026) · documentado el 19/11/2026 (prompt C19). Prompts de origen: `prompts.md` C11–C18.

## Decisiones

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| D1 | Contraseñas con **scrypt** de `node:crypto` (N=2^14, r=8, p=1, salt de 16 bytes; formato `scrypt$salt$hash`) y comparación en tiempo constante. Política: 8–128 caracteres con letra y número. | bcrypt/argon2 (dependencia nativa) · Cognito | Sin dependencias nativas; Cognito sigue siendo la visión v2 (docs/11). |
| D2 | Login separado por tipo de cuenta (`candidate` / `employer`) con **401 uniforme** (`InvalidCredentialsError`) para correo inexistente, contraseña incorrecta o tipo de cuenta equivocado. | Mensajes distintos | Evita enumeración de cuentas (OWASP A07). |
| D3 | Cerrar vacante = **soft delete** (`status = 'closed'`, `closed_at`). Solo desde `draft`, `pending_payment`, `published` u `on_hold`; si no → `409 job-not-closable`. | `DELETE` físico | Conserva el historial de postulaciones y la trazabilidad; migraciones expand-only. |
| D4 | Importación 1..N con **reporte por fila** (máximo 500 filas) y **upsert por `(organization_id, external_id)`**; CSV RFC 4180, JSON `CanonicalJob`, PDF segmentado por `Vacante:`/`Puesto:`. PDF siempre en borrador. | Importación todo-o-nada | Un archivo con errores parciales no bloquea las filas válidas; el PDF requiere revisión humana. |
| D5 | Notificaciones **in-app** en `notifications.notification` + **email** por el puerto `EmailSender` (`log` o `smtp` → Mailpit). La web consulta por **polling cada 10 s** y muestra toasts. | WebSocket / EventBridge | El bus de eventos y el tiempo real son v2 (docs/05); el polling basta para la demo. |
| D6 | Email solo en cambios relevantes: `shortlisted`, `offer`, `hired`, `rejected` y cierre de vacante. Los pasos intermedios van solo in-app. | Email en cada cambio | Menos ruido para la candidata. |
| D7 | **Moneda única USD** mensual. Migración `0003` con default `USD` y `CHECK (currency = 'USD') NOT VALID`; las importaciones con otra moneda fallan por fila (422). | Multimoneda con tipo de cambio | Simplifica filtros y comparación; `NOT VALID` evita reescribir la tabla. |
| D8 | **Vacantes urgentes** con columna `urgent boolean` (migración `0004`) e índice parcial `WHERE status = 'published' AND urgent`. | Etiquetas libres | Filtro y orden baratos. |
| D9 | **Soft skills** como skills de la taxonomía con categoría «Soft skills»; la vacante las declara aparte (`softSkills`). Solo cuentan para el score si la candidata las confirma. No cambian pesos ni fórmula → `MATCH_MODEL_VERSION` sigue en `match-v1`. | Modelo de soft skills separado | Reutiliza la regla ética del match (solo `confirmed`). |
| D10 | Radares por tipo de skill (técnicas y soft) calculados en el cliente a partir del match y del perfil (`SkillComparisonRadars`, SVG propio `RadarSvg`); si hay menos de 3 ejes se completa con skills del perfil y se avisa. | Nuevo endpoint | El match ya trae los niveles; evita otra llamada. |
| D11 | **i18n ES/EN sin dependencias** (`apps/web/src/i18n`): diccionarios tipados (mismas claves obligatorias), `nexo.lang` + `?lang=`, `<html lang>` dinámico. La API envía datos (`jobTitle`, códigos de error) y el cliente redacta los textos. | i18next | Presupuesto de JS inicial < 180 KB gzip; tipado fuerte de claves. |
| D12 | Postulación sin sesión: el detalle invita a registrarse o iniciar sesión y regresa con `?next=`, aceptando solo rutas internas (`/…`, sin `//`). | Redirección libre | Evita redirecciones abiertas. |
| D13 | Fondo animado de IA montado **una vez** en el layout (canvas, `prefers-reduced-motion`) y superficies «de vidrio». | Fondo por página | Consistencia y menor costo de render. |

## Datos
- `0002_accounts_jobs_notifications.sql`: `identity.user.password_hash`, `jobs.job.closed_at`, `source_type`, `external_id` (único por organización), estado `closed`, tabla `notifications.notification`.
- `0003_job_currency_usd.sql` y `0004_job_urgent.sql` (ver D7 y D8). Todas son expand-only.

## Riesgos y pendientes
- Los adaptadores PostgreSQL de este change no se han probado contra pgvector real (`make test-int`, requiere Docker) → tarea 2.8.
- Falta la revisión del subagente `adversarial-reviewer` → tarea 4.2.
