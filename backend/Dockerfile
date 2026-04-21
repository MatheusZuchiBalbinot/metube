FROM composer:latest AS vendor

WORKDIR /app

COPY . .

RUN composer install \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

FROM dunglas/frankenphp:latest

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    mbstring \
    pcntl \
    bcmath \
    sockets \
    opcache \
    redis

COPY --from=vendor /app /app

COPY docker/php.ini /usr/local/etc/php/conf.d/uploads.ini

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
