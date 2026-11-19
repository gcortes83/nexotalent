-- Change add-accounts-jobs-notifications · expand-only (no borra ni renombra columnas existentes).

-- Cuentas con contraseña (scrypt). NULL = cuenta solo de demo.
ALTER TABLE identity."user" ADD COLUMN password_hash text;

-- Vacantes: cierre lógico (soft delete) e importación idempotente.
ALTER TABLE jobs.job DROP CONSTRAINT job_status_check;
ALTER TABLE jobs.job ADD CONSTRAINT job_status_check
  CHECK (status IN ('draft','pending_payment','published','on_hold','filled','cancelled','expired','closed'));
ALTER TABLE jobs.job ADD COLUMN closed_at timestamptz;
ALTER TABLE jobs.job ADD COLUMN source_type text NOT NULL DEFAULT 'manual'
  CHECK (source_type IN ('manual','seed','csv','json','pdf'));
ALTER TABLE jobs.job ADD COLUMN external_id text CHECK (length(external_id) <= 120);
CREATE UNIQUE INDEX job_external_id_uq ON jobs.job (organization_id, external_id) WHERE external_id IS NOT NULL;

-- Notificaciones in-app (el email se envía por el puerto EmailSender).
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE TABLE notifications.notification (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES identity."user"(id),
  kind        text NOT NULL CHECK (kind IN ('selected','status_changed','job_closed')),
  title       text NOT NULL CHECK (length(title) <= 200),
  body        text NOT NULL CHECK (length(body) <= 2000),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_user_idx ON notifications.notification (user_id, created_at DESC);
CREATE INDEX notification_unread_idx ON notifications.notification (user_id) WHERE read_at IS NULL;
