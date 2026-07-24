# Local Development Reference

Reference material for running SMSPit locally. New to the project? Start with [Getting Started](getting-started.md) instead — a step-by-step walkthrough from clone to your first captured message. Come back here for the full per-service command reference and troubleshooting.

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
| `ai-service` (FastAPI) | `cp ai-service/.env.example ai-service/.env` | `cd ai-service && pip install -r requirements.txt` |
| `gateway` (Go) | `cp gateway/.env.example gateway/.env` | `cd gateway && go mod download` |
| `worker` (Go) | `cp worker/.env.example worker/.env` | `cd worker && go mod download` |

## Running services

Every service can run standalone during development:

```bash
cd auth-service && php artisan serve  # http://localhost:8000
cd sms-service && npm run start:dev   # http://localhost:3000
cd gateway && go run ./cmd/gateway    # http://localhost:8080
cd dashboard && npm run dev           # http://localhost:5173
cd ai-service && uvicorn app.main:app --reload  # http://localhost:8001
cd worker && go run ./cmd/worker
```

`scripts/dev-up.sh` starts `auth-service`, `sms-service`, `gateway`, and `dashboard` together without Docker (needs a local Postgres and Redis already running) — see [Getting Started](getting-started.md) for the full walkthrough.

`docker compose up -d` brings up all 8 services (the six above plus Postgres and Redis) together, plus the observability stack (Jaeger, Prometheus, Grafana) — see [Production Deployment](production-deployment.md#docker-compose-single-host). Not run/verified in the environment this documentation set was built in (no Docker available) — see [CHANGELOG.md](changelog.md#known-gaps).

## Troubleshooting

- **`composer install` fails with missing `ext-dom`/`ext-xml`**: install the PHP `dom` and `xml` extensions for your PHP version (e.g. `sudo apt install php-xml` on Debian/Ubuntu), or run with `composer install --ignore-platform-req=ext-dom --ignore-platform-req=ext-xml` if you only need to typecheck/lint rather than run the app.
- **A service's `.env` already exists**: `scripts/setup.sh` never overwrites an existing `.env` — delete it first if you want it regenerated from `.env.example`.
