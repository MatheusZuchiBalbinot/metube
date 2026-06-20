#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# Load repo-root .env so DOMAIN / ACME_EMAIL / VITE_* live in a single place.
if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# ─── Preflight checks ─────────────────────────────────────────────────────────

required_vars=(
    DOMAIN
    ACME_EMAIL
    VITE_REVERB_APP_KEY
    VITE_REVERB_HOST
)

missing=()
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        missing+=("$var")
    fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Error: missing required environment variables:"
    for v in "${missing[@]}"; do echo "  - $v"; done
    echo ""
    echo "Set them in the repo-root .env (see .env.example)."
    exit 1
fi

# ─── Deploy ───────────────────────────────────────────────────────────────────

echo "Pulling latest code..."
git pull origin main

echo "Building and starting production stack..."
$COMPOSE up --build -d

echo "Waiting for backend to be ready..."
until $COMPOSE exec -T backend php artisan about --only=Environment 2>/dev/null | grep -q "production"; do
    sleep 2
done

echo ""
echo "Stack status:"
$COMPOSE ps
