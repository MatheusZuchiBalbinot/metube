#!/usr/bin/env sh
set -e

IMAGE_HASH=$(cat /vendor-backup/.lock-hash 2>/dev/null || echo "")

if [ "$#" -gt 0 ]; then
    until [ "$(cat /app/vendor/.lock-hash 2>/dev/null)" = "$IMAGE_HASH" ]; do
        echo "Waiting for vendor sync..."
        sleep 1
    done

    exec "$@"
fi

VOLUME_HASH=$(cat /app/vendor/.lock-hash 2>/dev/null || echo "")

if [ "$VOLUME_HASH" != "$IMAGE_HASH" ]; then
    echo "Syncing vendor from image..."
    find /app/vendor -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a /vendor-backup/. /app/vendor/
    echo "$IMAGE_HASH" > /app/vendor/.lock-hash
fi

if [ -z "$APP_KEY" ]; then
    echo "APP_KEY not set — generating..."
    php artisan key:generate --force
fi

if [ "$APP_ENV" = "production" ]; then
    # Skip file re-stat in prod (code is immutable between deploys).
    echo "opcache.validate_timestamps=0" > /usr/local/etc/php/conf.d/zz-opcache-prod.ini

    echo "Caching Laravel config, routes, events, views..."
    php artisan optimize || true
else
    rm -f /usr/local/etc/php/conf.d/zz-opcache-prod.ini || true

    echo "Clearing Laravel caches..."
    php artisan optimize:clear || true
    rm -rf bootstrap/cache/*.php || true
fi

echo "Waiting for database..."

until pg_isready \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d "$DB_DATABASE" \
  -t 1
do
  sleep 1
done

echo "Database ready ✔"

echo "Running migrations..."
php artisan migrate --force

# "auto"/"0" → one worker per CPU core.
WORKERS="${OCTANE_WORKERS:-2}"
if [ "$WORKERS" = "auto" ] || [ "$WORKERS" = "0" ]; then
    WORKERS=$(nproc 2>/dev/null || echo 2)
fi

echo "Starting Octane with ${WORKERS} worker(s)..."
exec php artisan octane:start \
  --server=frankenphp \
  --host=0.0.0.0 \
  --port=8000 \
  --workers="$WORKERS" \
  --max-requests=500
