#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
test -f .env || { echo '.env is required (copy .env.example)' >&2; exit 1; }; set -a; source .env; set +a
: "${DATABASE_URL:?DATABASE_URL is required}"; : "${JWT_SECRET:?JWT_SECRET is required}"; (( ${#JWT_SECRET} >= 32 )) || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
test -d backend/node_modules && test -d frontend/node_modules || { echo 'Dependencies are missing; install them explicitly before starting' >&2; exit 1; }
mode="${1:-all}"; pids=(); trap 'for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done' EXIT INT TERM
if [[ "$mode" == backend || "$mode" == all ]]; then npm --prefix backend start & pids+=("$!"); fi
if [[ "$mode" == frontend || "$mode" == all ]]; then npm --prefix frontend start & pids+=("$!"); fi
[[ ${#pids[@]} -gt 0 ]] || { echo 'Usage: ./start.sh [all|backend|frontend]' >&2; exit 2; }; wait
