#!/usr/bin/env bash
# Generate Better Auth's current schema from the checked-in auth configuration
# and apply it to DATABASE_URL. Review the generated SQL before using this in
# production; the script intentionally does not commit generated SQL because
# plugin configuration can change the schema.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.self-hosted.yml"

: "${DATABASE_URL:?Set DATABASE_URL to the PostgreSQL database to initialize}"

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" "$@"
    return
  fi

  local expected_port="${POSTGRES_HOST_PORT:-5433}"
  case "$DATABASE_URL" in
    postgres://postgres:postgres@localhost:"$expected_port"/onerouter*|postgres://postgres:postgres@127.0.0.1:"$expected_port"/onerouter*)
      ;;
    *)
      echo "Host psql is unavailable and DATABASE_URL is not the local Compose database; refusing the Docker fallback." >&2
      exit 1
      ;;
  esac

  if command -v docker >/dev/null 2>&1 && docker compose -f "$COMPOSE_FILE" ps --status running postgres >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d onerouter "$@"
    return
  fi

  echo "psql is required. Install the PostgreSQL client, or start the self-hosted Postgres container so Docker can run psql inside it." >&2
  exit 1
}

SCHEMA_FILE="$(mktemp "${TMPDIR:-/tmp}/1router-auth-schema.XXXXXX.sql")"
cleanup() {
  rm -f "$SCHEMA_FILE"
}
trap cleanup EXIT

# Run from the site workspace so the config loader can resolve its @/* alias.
(
  cd "$ROOT_DIR/apps/site"
  bun x @better-auth/cli@1.4.21 generate \
    --config ./src/lib/auth.ts \
    --output "$SCHEMA_FILE" \
    --yes
)

printf 'Applying Better Auth schema to the configured database.\n'
run_psql --set ON_ERROR_STOP=1 < "$SCHEMA_FILE"

# Application tables are maintained by explicit, versioned migrations so
# upgrades can add columns/indexes safely instead of relying on CREATE TABLE IF
# NOT EXISTS. This also keeps Better Auth's generated schema separate.
DATABASE_URL="$DATABASE_URL" bash "$ROOT_DIR/scripts/migrate-app-db.sh"

printf 'Better Auth schema and application migrations applied successfully.\n'
