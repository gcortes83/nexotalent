-- Vacantes urgentes («hot»): el empleador las destaca con 🔥 en el catálogo. Expand-only.
ALTER TABLE jobs.job ADD COLUMN urgent boolean NOT NULL DEFAULT false;
CREATE INDEX job_urgent_idx ON jobs.job (published_at DESC) WHERE status = 'published' AND urgent;
