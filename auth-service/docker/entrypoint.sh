#!/bin/sh
set -e

if [ ! -f /var/www/html/.env ] && [ -f /var/www/html/.env.example ]; then
    cp /var/www/html/.env.example /var/www/html/.env
fi

php artisan key:generate --force --no-interaction || true

# Don't hard-fail container start if the DB isn't reachable yet (e.g. a
# standalone `docker run` with no Postgres linked) -- migrations run
# for real once docker-compose wires up the DB dependency (Day 49).
php artisan migrate --force --no-interaction || echo "Skipping migrations: database not reachable"

exec "$@"
