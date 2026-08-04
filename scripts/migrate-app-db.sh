#!/usr/bin/env bash
# Apply checked-in operator-owned application migrations to DATABASE_URL.
# Better Auth's generated schema is intentionally managed separately by
# bootstrap-auth-db.sh / auth:migrate.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/scripts/migrations"

: "${DATABASE_URL:?Set DATABASE_URL to the PostgreSQL database to migrate}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required. Install the PostgreSQL client or run this script in the postgres container." >&2
  exit 1
fi

mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
if ((${#migrations[@]} == 0)); then
  echo "No application migrations found in $MIGRATIONS_DIR" >&2
  exit 1
fi

schema_table_exists=$(psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --tuples-only --no-align \
  --command "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'router_schema_migrations')")

for migration in "${migrations[@]}"; do
  filename="${migration##*/}"
  version="${filename%.sql}"

  if [[ "$schema_table_exists" == "t" ]]; then
    applied=$(psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --tuples-only --no-align \
      --command "SELECT EXISTS (SELECT 1 FROM router_schema_migrations WHERE version = '$version')")
    if [[ "$applied" == "t" ]]; then
      printf 'Skipping applied application migration %s\n' "$filename"
      continue
    fi
  fi

  printf 'Applying application migration %s\n' "$filename"
  psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --single-transaction --file "$migration"
  schema_table_exists="t"
done

printf 'Application migrations applied successfully.\n'
