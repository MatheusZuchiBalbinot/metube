FROM composer:latest AS vendor

WORKDIR /app

COPY . .

# --no-dev keeps dev/test tooling (PHPUnit/Pest, PHPStan, Pint, etc.) out of the
# production image. CI installs dev deps separately on the runner, so this stage
# only ever feeds the runtime image and is safe to slim down.
RUN composer install \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-dev \
    --ignore-platform-reqs \
    --no-scripts

FROM dunglas/frankenphp:latest

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    mbstring \
    pcntl \
    bcmath \
    sockets \
    opcache \
    redis \
    gd \
    opentelemetry

COPY --from=vendor /app /app

RUN cp -a /app/vendor /vendor-backup && \
    md5sum /app/composer.lock | awk '{print $1}' > /vendor-backup/.lock-hash

COPY docker/php.ini /usr/local/etc/php/conf.d/uploads.ini

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
