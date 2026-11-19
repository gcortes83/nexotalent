-- Moneda única de la plataforma: salario mensual en USD (dólares estadounidenses). Expand-only.
ALTER TABLE jobs.job ALTER COLUMN currency SET DEFAULT 'USD';
-- NOT VALID: aplica a filas nuevas o actualizadas sin reescribir las existentes
-- (el seed de demo se recarga en USD con `make db-seed`).
ALTER TABLE jobs.job ADD CONSTRAINT job_currency_usd CHECK (currency = 'USD') NOT VALID;
