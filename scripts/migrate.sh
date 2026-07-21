#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$project_dir"; test -f .env && { set -a; source .env; set +a; }
: "${DATABASE_URL:?DATABASE_URL is required}"; command -v psql >/dev/null || { echo 'psql is required' >&2; exit 1; }
for migration in backend/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"; done
