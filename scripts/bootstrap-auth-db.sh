#!/usr/bin/env bash
# Generate Better Auth's current schema from the checked-in auth configuration
# and apply it to DATABASE_URL. Review the generated SQL before using this in
# production; the script intentionally does not commit generated SQL because
# plugin configuration can change the schema.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${DATABASE_URL:?Set DATABASE_URL to the PostgreSQL database to initialize}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required. Install the PostgreSQL client or run this script in the postgres container." >&2
  exit 1
fi

SCHEMA_FILE="$(mktemp "${TMPDIR:-/tmp}/1router-auth-schema.XXXXXX.sql")"
cleanup() {
  rm -f "$SCHEMA_FILE"
}
trap cleanup EXIT

bun x @better-auth/cli@1.4.21 generate \
  --config ./apps/site/src/lib/auth.ts \
  --output "$SCHEMA_FILE" \
  --yes

printf 'Applying Better Auth schema to %s\n' "${DATABASE_URL%%\?*}"
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file "$SCHEMA_FILE"

# Application tables are maintained by explicit, versioned migrations so
# upgrades can add columns/indexes safely instead of relying on CREATE TABLE IF
# NOT EXISTS. This also keeps Better Auth's generated schema separate.
DATABASE_URL="$DATABASE_URL" bash "$ROOT_DIR/scripts/migrate-app-db.sh"

printf 'Better Auth schema and application migrations applied successfully.\n'
