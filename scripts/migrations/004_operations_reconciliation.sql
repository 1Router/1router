-- 1Router operations and reconciliation, migration 004.
-- All cleanup/rollup work is safe to run repeatedly from an external job runner.

ALTER TABLE router_policies
  ADD COLUMN IF NOT EXISTS max_concurrent_requests integer
    CHECK (max_concurrent_requests IS NULL OR max_concurrent_requests >= 0);

CREATE TABLE IF NOT EXISTS router_public_rate_limit_buckets (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS router_public_rate_limit_buckets_window_idx
  ON router_public_rate_limit_buckets (window_start);

CREATE INDEX IF NOT EXISTS router_quota_reservations_expires_at_idx
  ON router_quota_reservations (expires_at);
CREATE INDEX IF NOT EXISTS router_usage_created_at_idx
  ON router_usage (created_at DESC);

CREATE TABLE IF NOT EXISTS router_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  identity text,
  user_id text,
  api_key_id text,
  organization_id text,
  model text,
  provider text,
  request_id text,
  status integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS router_audit_events_identity_created_at_idx
  ON router_audit_events (identity, created_at DESC);
CREATE INDEX IF NOT EXISTS router_audit_events_type_created_at_idx
  ON router_audit_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS router_audit_events_created_at_idx
  ON router_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS router_alerts_created_at_idx
  ON router_alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS router_usage_daily (
  usage_date date NOT NULL,
  user_id text NOT NULL DEFAULT '',
  api_key_id text NOT NULL DEFAULT '',
  organization_id text NOT NULL DEFAULT '',
  model text NOT NULL,
  requests bigint NOT NULL DEFAULT 0,
  successful_requests bigint NOT NULL DEFAULT 0,
  failed_requests bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  cost_microdollars bigint NOT NULL DEFAULT 0,
  last_usage_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, user_id, api_key_id, organization_id, model)
);

CREATE TABLE IF NOT EXISTS router_billing_reconciliation (
  user_id text NOT NULL,
  period_start date NOT NULL,
  requests bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  cost_microdollars bigint NOT NULL DEFAULT 0,
  last_usage_at timestamptz,
  reconciled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);

INSERT INTO router_schema_migrations (version)
VALUES ('004_operations_reconciliation')
ON CONFLICT (version) DO NOTHING;
