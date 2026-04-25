#!/usr/bin/env sh
set -e

echo "Clearing Laravel caches..."
php artisan optimize:clear || true
rm -rf bootstrap/cache/*.php || true

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

echo "Seeding database..."
php artisan db:seed --force

if [ "$#" -gt 0 ]; then
    exec "$@"
fi

echo "Starting Octane..."
exec php artisan octane:start \
  --server=frankenphp \
  --host=0.0.0.0 \
  --port=8000
