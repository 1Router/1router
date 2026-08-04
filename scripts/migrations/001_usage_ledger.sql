-- 1Router operator-owned application schema, migration 001.
-- Run with psql --single-transaction and ON_ERROR_STOP=1.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS router_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

SELECT pg_advisory_xact_lock(hashtext('1router-application-schema'));

CREATE TABLE IF NOT EXISTS router_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity text NOT NULL,
  model text NOT NULL,
  status integer NOT NULL,
  request_id text,
  duration_ms integer NOT NULL,
  prompt_tokens bigint NOT NULL DEFAULT 0,
  completion_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  streamed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Keep upgrades safe for installations created by the original bootstrap,
-- where CREATE TABLE IF NOT EXISTS alone would not add later columns.
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS duration_ms integer NOT NULL DEFAULT 0;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS prompt_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS completion_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS total_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS streamed boolean NOT NULL DEFAULT false;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS router_usage_identity_created_at_idx
  ON router_usage (identity, created_at DESC);

CREATE TABLE IF NOT EXISTS router_quota_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS router_quota_reservations_identity_expires_at_idx
  ON router_quota_reservations (identity, expires_at);

INSERT INTO router_schema_migrations (version)
VALUES ('001_usage_ledger')
ON CONFLICT (version) DO NOTHING;
