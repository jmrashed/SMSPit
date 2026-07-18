# Local dev setup

## Quick start

```bash
git clone https://github.com/jmrashed/SMSPit.git
cd SMSPit
./scripts/setup.sh
```

This copies `.env.example` → `.env` at the root and for every scaffolded service, then installs each service's dependencies (skipping any service that isn't scaffolded yet or whose toolchain isn't installed on your machine). It reports failures per service and continues rather than aborting the whole run.

## Manual setup (per service)

If you'd rather set up one service at a time, or `scripts/setup.sh` can't run a step for you (e.g. a missing PHP extension), each service is independently installable:

| Service | Env file | Install command |
|---|---|---|
| root (`docker-compose.yml`) | `cp .env.example .env` | — |
| `auth-service` (Laravel) | `cp auth-service/.env.example auth-service/.env` | `cd auth-service && composer install` |
| `sms-service` (NestJS) | `cp sms-service/.env.example sms-service/.env` | `cd sms-service && npm install` |
| `dashboard` (React/Vite) | `cp dashboard/.env.example dashboard/.env` | `cd dashboard && npm install` |
| `ai-service` (FastAPI) | not yet scaffolded | `cd ai-service && pip install -r requirements.txt` (once it exists) |
| `gateway` / `worker` (Go) | not yet scaffolded | `cd <service> && go mod download` (once they exist) |

## Running services

Each scaffolded service can run standalone during development:

```bash
cd sms-service && npm run start:dev   # http://localhost:3000
cd dashboard && npm run dev           # http://localhost:5173
cd auth-service && php artisan serve  # http://localhost:8000
```

`docker compose up -d` will bring up all services together once Days 26–28 wire real Dockerfiles into `docker-compose.yml`; for now it only stands up Postgres/Redis and placeholder service entries.

## Troubleshooting

- **`composer install` fails with missing `ext-dom`/`ext-xml`**: install the PHP `dom` and `xml` extensions for your PHP version (e.g. `sudo apt install php-xml` on Debian/Ubuntu), or run with `composer install --ignore-platform-req=ext-dom --ignore-platform-req=ext-xml` if you only need to typecheck/lint rather than run the app.
- **A service's `.env` already exists**: `scripts/setup.sh` never overwrites an existing `.env` — delete it first if you want it regenerated from `.env.example`.
