#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
test -f .env || { echo '.env is required (copy .env.example)' >&2; exit 1; }; set -a; source .env; set +a
: "${DATABASE_URL:?DATABASE_URL is required}"; : "${JWT_SECRET:?JWT_SECRET is required}"; (( ${#JWT_SECRET} >= 32 )) || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
test -d backend/node_modules && test -d frontend/node_modules || { echo 'Dependencies are missing; install them explicitly before starting' >&2; exit 1; }
mode="${1:-all}"; pids=(); trap 'for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done' EXIT INT TERM
BACKEND_PORT="${BACKEND_PORT:-3001}"; FRONTEND_PORT="${FRONTEND_PORT:-3000}"
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $port is occupied; refusing to terminate another process" >&2; exit 1; }; done
node backend/runtimeBootstrap.js
if [[ "$mode" == backend || "$mode" == all ]]; then (cd backend && exec node server.js) & pids+=("$!"); fi
if [[ "$mode" == frontend || "$mode" == all ]]; then (cd frontend && exec env PORT="$FRONTEND_PORT" BROWSER=none ./node_modules/.bin/react-scripts start) & pids+=("$!"); fi
[[ ${#pids[@]} -gt 0 ]] || { echo 'Usage: ./start.sh [all|backend|frontend]' >&2; exit 2; }; wait
