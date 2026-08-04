#!/usr/bin/env bash
# Apply checked-in operator-owned application migrations to DATABASE_URL.
# Better Auth's generated schema is intentionally managed separately by
# bootstrap-auth-db.sh / auth:migrate.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/scripts/migrations"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.self-hosted.yml"

: "${DATABASE_URL:?Set DATABASE_URL to the PostgreSQL database to migrate}"

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

# Keep the migration runner usable for an empty database even when Better Auth
# has not been bootstrapped yet. Migration 001 creates this table as well, but
# creating it here lets the runner safely inspect and apply ordered migrations.
run_psql --set ON_ERROR_STOP=1 --command "CREATE TABLE IF NOT EXISTS router_schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())" >/dev/null

mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
if ((${#migrations[@]} == 0)); then
  echo "No application migrations found in $MIGRATIONS_DIR" >&2
  exit 1
fi

schema_table_exists=$(run_psql --set ON_ERROR_STOP=1 --tuples-only --no-align \
  --command "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'router_schema_migrations')")

for migration in "${migrations[@]}"; do
  filename="${migration##*/}"
  version="${filename%.sql}"

  if [[ "$schema_table_exists" == "t" ]]; then
    applied=$(run_psql --set ON_ERROR_STOP=1 --tuples-only --no-align \
      --command "SELECT EXISTS (SELECT 1 FROM router_schema_migrations WHERE version = '$version')")
    if [[ "$applied" == "t" ]]; then
      printf 'Skipping applied application migration %s\n' "$filename"
      continue
    fi
  fi

  printf 'Applying application migration %s\n' "$filename"
  run_psql --set ON_ERROR_STOP=1 --single-transaction < "$migration"
  schema_table_exists="t"
done

printf 'Application migrations applied successfully.\n'
