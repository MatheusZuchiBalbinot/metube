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
backend_ready=false
for _ in $(seq 1 60); do
    if $COMPOSE exec -T backend php artisan about --only=Environment 2>/dev/null | grep -q "production"; then
        backend_ready=true
        break
    fi
    sleep 2
done

if [[ "$backend_ready" != "true" ]]; then
    echo "Error: backend did not become ready within 120s. Last logs:"
    $COMPOSE logs --tail=100 backend
    exit 1
fi

echo "Checking Caddy /healthz..."
# :9000/healthz is only exposed inside the container network (see
# caddy/Caddyfile.prod), so probe it from inside the caddy container itself,
# the same way its own Docker healthcheck does.
if ! $COMPOSE exec -T caddy wget --quiet --tries=1 --spider "http://localhost:9000/healthz"; then
    echo "Error: /healthz did not return success."
    $COMPOSE logs --tail=100 caddy
    exit 1
fi

echo ""
echo "Stack status:"
$COMPOSE ps
