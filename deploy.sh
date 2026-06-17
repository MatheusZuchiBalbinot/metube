#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
CERT_NAME="metube"
CERT_PATH="/etc/letsencrypt/live/${CERT_NAME}"

# Load repo-root .env so DOMAIN / CERTBOT_EMAIL / VITE_* live in a single place.
if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# ─── Preflight checks ─────────────────────────────────────────────────────────

required_vars=(
    DOMAIN
    CERTBOT_EMAIL
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

# ─── First run: bootstrap the TLS certificate ───────────────────────────────────
# nginx needs a cert to boot, but the cert needs nginx to serve the ACME
# challenge. Break the cycle once with a throwaway self-signed cert, then swap
# in the real one. Renewal afterwards is automatic.

cert_exists() {
    $COMPOSE run --rm --no-deps --entrypoint \
        "test -f ${CERT_PATH}/fullchain.pem" certbot >/dev/null 2>&1
}

bootstrap_tls() {
    local staging_arg=""
    [[ "${STAGING:-0}" != "0" ]] && staging_arg="--staging"

    echo "No TLS certificate found — bootstrapping Let's Encrypt for ${DOMAIN}..."

    echo "  → creating a temporary self-signed certificate..."
    $COMPOSE run --rm --entrypoint \
        "sh -c 'mkdir -p ${CERT_PATH} && openssl req -x509 -nodes -newkey rsa:2048 -days 1 -keyout ${CERT_PATH}/privkey.pem -out ${CERT_PATH}/fullchain.pem -subj /CN=localhost'" certbot

    echo "  → starting nginx..."
    $COMPOSE up --build -d nginx

    echo "  → removing the temporary certificate..."
    $COMPOSE run --rm --entrypoint \
        "rm -rf /etc/letsencrypt/live/${CERT_NAME} /etc/letsencrypt/archive/${CERT_NAME} /etc/letsencrypt/renewal/${CERT_NAME}.conf" certbot

    echo "  → requesting the real certificate..."
    $COMPOSE run --rm --entrypoint \
        "certbot certonly --webroot -w /var/www/certbot ${staging_arg} --cert-name ${CERT_NAME} -d ${DOMAIN} --email ${CERTBOT_EMAIL} --rsa-key-size 2048 --agree-tos --no-eff-email --force-renewal" certbot

    echo "  → reloading nginx with the real certificate..."
    $COMPOSE exec nginx nginx -s reload
    echo "TLS ready ✔"
}

if ! cert_exists; then
    bootstrap_tls
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
