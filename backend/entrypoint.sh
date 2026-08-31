#!/usr/bin/env sh
set -e

IMAGE_HASH=$(cat /vendor-backup/.lock-hash 2>/dev/null || echo "")

if [ "$#" -gt 0 ]; then
    until [ "$(cat /app/vendor/.lock-hash 2>/dev/null)" = "$IMAGE_HASH" ]; do
        echo "Waiting for vendor sync..."
        sleep 1
    done

    # `docker compose run --rm backend <cmd>` is always a one-off dev/tooling
    # invocation (tests, lint, tinker) — never how production traffic is served —
    # but it shares the real Redis with the long-running backend/horizon
    # services. Forcing sync queue + array cache keeps ShouldBeUnique locks and
    # queued jobs in-process instead of leaking into that shared Redis between
    # runs. Set FORCE_TEST_ENV=false to opt out (e.g. to debug against the real
    # queue/cache from a one-off command).
    if [ "${FORCE_TEST_ENV:-true}" = "true" ]; then
        export QUEUE_CONNECTION=sync
        export CACHE_STORE=array
    fi

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

if [ "$SEED_DEMO_CONTENT" = "true" ]; then
    # DemoContentSeeder is idempotent (firstOrCreate throughout — see its
    # docblock), so re-running it on every boot is safe and just a no-op once
    # the data already exists.
    echo "Seeding demo content..."
    php artisan db:seed --class=DemoContentSeeder --force
fi

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
