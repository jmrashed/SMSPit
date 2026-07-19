# syntax=docker/dockerfile:1

FROM composer:2 AS composer-build
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM php:8.3-fpm-alpine AS runtime
RUN apk add --no-cache nginx supervisor postgresql-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql mbstring bcmath

WORKDIR /var/www/html
COPY --from=composer-build /app ./
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
