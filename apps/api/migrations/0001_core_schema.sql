-- NexoTalent AI · núcleo MVP · migración expand-only (sin DROP).
-- Esquema por módulo (límites de dominio del monolito modular). FKs solo dentro del mismo esquema,
-- salvo referencias explícitas documentadas en docs/06-modelo-datos.md.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS candidates;
CREATE SCHEMA IF NOT EXISTS applications;
CREATE SCHEMA IF NOT EXISTS matching;

CREATE TABLE identity.organization (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity."user" (
  id              text PRIMARY KEY,
  email           text NOT NULL UNIQUE CHECK (email = lower(email)),
  full_name       text NOT NULL,
  role            text NOT NULL CHECK (role IN ('candidate','recruiter','employer_admin','platform_admin')),
  organization_id text REFERENCES identity.organization(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((role IN ('recruiter','employer_admin')) = (organization_id IS NOT NULL))
);

CREATE TABLE matching.skill (
  id       text PRIMARY KEY,
  name     text NOT NULL UNIQUE,
  category text NOT NULL,
  aliases  text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE jobs.job (
  id                text PRIMARY KEY,
  organization_id   text NOT NULL,
  organization_name text NOT NULL,
  title             text NOT NULL CHECK (length(title) <= 160),
  description       text NOT NULL,
  status            text NOT NULL CHECK (status IN ('draft','pending_payment','published','on_hold','filled','cancelled','expired')),
  seniority         text NOT NULL CHECK (seniority IN ('junior','mid','senior','lead')),
  modality          text NOT NULL CHECK (modality IN ('onsite','hybrid','remote')),
  country           char(2) NOT NULL,
  city              text,
  salary_min        numeric(12,2),
  salary_max        numeric(12,2),
  currency          char(3) NOT NULL DEFAULT 'MXN',
  positions_total   int NOT NULL CHECK (positions_total >= 1),
  positions_filled  int NOT NULL DEFAULT 0,
  applicants_count  int NOT NULL DEFAULT 0 CHECK (applicants_count >= 0),
  -- MVP: pago simulado (Stripe en v2). Una vacante publicada se marca como pagada.
  paid_simulated    boolean NOT NULL DEFAULT false,
  embedding         vector(1024),
  published_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (positions_filled BETWEEN 0 AND positions_total)
);
CREATE INDEX job_prefilter_idx ON jobs.job (status, country, modality);
CREATE INDEX job_org_idx ON jobs.job (organization_id);
CREATE INDEX job_embedding_hnsw ON jobs.job USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64) WHERE status = 'published';
CREATE INDEX job_fts_idx ON jobs.job USING gin (to_tsvector('spanish', title || ' ' || description));

CREATE TABLE jobs.job_skill (
  job_id    text NOT NULL REFERENCES jobs.job(id),
  skill_id  text NOT NULL,
  name      text NOT NULL,
  category  text NOT NULL,
  level     smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  weight    numeric(5,2) NOT NULL DEFAULT 1 CHECK (weight > 0),
  must_have boolean NOT NULL DEFAULT false,
  position  smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (job_id, skill_id)
);

-- Sin atributos protegidos (género, edad, estado civil, foto, nacionalidad, dirección exacta).
CREATE TABLE candidates.candidate (
  id                   text PRIMARY KEY,
  user_id              text NOT NULL UNIQUE,
  full_name            text NOT NULL,
  headline             text,
  seniority            text CHECK (seniority IN ('junior','mid','senior','lead')),
  country              char(2),
  preferred_modalities text[] NOT NULL DEFAULT '{}',
  salary_expectation   numeric(12,2),
  resume_text          text,
  embedding            vector(1024),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE candidates.candidate_skill (
  candidate_id text NOT NULL REFERENCES candidates.candidate(id) ON DELETE CASCADE,
  skill_id     text NOT NULL,
  name         text NOT NULL,
  category     text NOT NULL,
  level        smallint NOT NULL CHECK (level BETWEEN 0 AND 5),
  source       text NOT NULL CHECK (source IN ('declared','extracted')),
  confirmed    boolean NOT NULL DEFAULT false,
  evidence     text,
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE applications.application (
  id                text PRIMARY KEY,
  job_id            text NOT NULL,
  candidate_id      text NOT NULL,
  organization_id   text NOT NULL,
  status            text NOT NULL CHECK (status IN ('submitted','in_review','shortlisted','interview_scheduled','interview_done','offer','hired','rejected','withdrawn')),
  version           int NOT NULL DEFAULT 1,
  match_score       numeric(5,4),
  created_at        timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
CREATE INDEX application_candidate_idx ON applications.application (candidate_id);
CREATE INDEX application_job_idx ON applications.application (job_id, match_score DESC);
CREATE INDEX application_stale_idx ON applications.application (organization_id, status_changed_at)
  WHERE status IN ('submitted','in_review','shortlisted','interview_scheduled','interview_done','offer');

CREATE TABLE applications.application_status_history (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications.application(id),
  from_status    text,
  to_status      text NOT NULL,
  actor_kind     text NOT NULL CHECK (actor_kind IN ('candidate','recruiter','system')),
  actor_id       text NOT NULL,
  reason         text,
  at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_history_idx ON applications.application_status_history (application_id, at);

CREATE TABLE matching.match_score (
  candidate_id  text NOT NULL,
  job_id        text NOT NULL,
  score         numeric(5,4) NOT NULL,
  result        jsonb NOT NULL,
  model_version text NOT NULL,
  computed_at   timestamptz NOT NULL,
  PRIMARY KEY (candidate_id, job_id)
);
CREATE INDEX match_score_job_idx ON matching.match_score (job_id);
