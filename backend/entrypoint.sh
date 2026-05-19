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

if [ "$APP_ENV" = "production" ]; then
    echo "Caching Laravel config, routes, events, views..."
    php artisan optimize || true
else
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

echo "Starting Octane..."
exec php artisan octane:start \
  --server=frankenphp \
  --host=0.0.0.0 \
  --port=8000
