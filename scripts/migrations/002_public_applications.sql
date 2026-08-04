-- 1Router operator-owned application identity and public showcase schema.
-- Apply with psql --single-transaction and ON_ERROR_STOP=1.

CREATE TABLE IF NOT EXISTS router_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_identity text NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  website_url text,
  public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS router_applications_owner_identity_idx
  ON router_applications (owner_identity, created_at DESC);

ALTER TABLE router_usage
  ADD COLUMN IF NOT EXISTS application_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'router_usage_application_id_fkey'
       AND conrelid = 'router_usage'::regclass
  ) THEN
    ALTER TABLE router_usage
      ADD CONSTRAINT router_usage_application_id_fkey
      FOREIGN KEY (application_id) REFERENCES router_applications(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS router_usage_application_created_at_idx
  ON router_usage (application_id, created_at DESC);

INSERT INTO router_schema_migrations (version)
VALUES ('002_public_applications')
ON CONFLICT (version) DO NOTHING;
