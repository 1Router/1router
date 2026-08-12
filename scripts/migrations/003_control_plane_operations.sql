-- 1Router control-plane operations, migration 003.
-- Adds durable scoped enforcement and managed-service operations without Redis.

ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS api_key_id text;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS organization_id text;
ALTER TABLE router_usage ADD COLUMN IF NOT EXISTS cost_microdollars bigint NOT NULL DEFAULT 0;

-- Backfill the original user identity format before new requests use the
-- explicit scope columns.
UPDATE router_usage
   SET user_id = substring(identity FROM 6)
 WHERE user_id IS NULL AND identity LIKE 'user:%';

CREATE INDEX IF NOT EXISTS router_usage_user_created_at_idx
  ON router_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS router_usage_api_key_created_at_idx
  ON router_usage (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS router_usage_organization_created_at_idx
  ON router_usage (organization_id, created_at DESC);

ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS api_key_id text;
ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS organization_id text;
ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS estimated_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE router_quota_reservations ADD COLUMN IF NOT EXISTS estimated_cost_microdollars bigint NOT NULL DEFAULT 0;

UPDATE router_quota_reservations
   SET user_id = substring(identity FROM 6)
 WHERE user_id IS NULL AND identity LIKE 'user:%';

CREATE TABLE IF NOT EXISTS router_policies (
  scope_type text NOT NULL CHECK (scope_type IN ('user', 'api_key', 'organization')),
  scope_id text NOT NULL,
  requests_per_day integer CHECK (requests_per_day IS NULL OR requests_per_day >= 0),
  requests_per_minute integer CHECK (requests_per_minute IS NULL OR requests_per_minute >= 0),
  tokens_per_month bigint CHECK (tokens_per_month IS NULL OR tokens_per_month >= 0),
  spend_limit_microdollars_per_month bigint CHECK (spend_limit_microdollars_per_month IS NULL OR spend_limit_microdollars_per_month >= 0),
  alert_threshold_percent integer NOT NULL DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS router_model_prices (
  model_id text PRIMARY KEY,
  input_microdollars_per_1k bigint NOT NULL DEFAULT 0 CHECK (input_microdollars_per_1k >= 0),
  output_microdollars_per_1k bigint NOT NULL DEFAULT 0 CHECK (output_microdollars_per_1k >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Operators may add a '*' row for a deployment-wide default price; model rows
-- override it. If neither exists, usage is reported as zero-cost until pricing
-- is configured explicitly.

CREATE TABLE IF NOT EXISTS router_rate_limit_buckets (
  scope_type text NOT NULL CHECK (scope_type IN ('user', 'api_key', 'organization')),
  scope_id text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  token_count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (scope_type, scope_id, window_start)
);

CREATE INDEX IF NOT EXISTS router_rate_limit_buckets_window_idx
  ON router_rate_limit_buckets (window_start);

CREATE TABLE IF NOT EXISTS router_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('user', 'api_key', 'organization')),
  scope_id text NOT NULL,
  kind text NOT NULL,
  period_start timestamptz NOT NULL,
  message text NOT NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_id, kind, period_start)
);

CREATE INDEX IF NOT EXISTS router_alerts_scope_created_at_idx
  ON router_alerts (scope_type, scope_id, created_at DESC);

INSERT INTO router_schema_migrations (version)
VALUES ('003_control_plane_operations')
ON CONFLICT (version) DO NOTHING;
