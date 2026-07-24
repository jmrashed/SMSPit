# Testing

How to run every service's test suite locally, and what CI does with them. For contribution conventions (commit style, PR process), see [CONTRIBUTING.md](https://github.com/jmrashed/SMSPit/blob/main/CONTRIBUTING.md) — this page only covers *running tests*.

## Required services

Some suites need real backing services to pass — not everything mocks out:

| Requirement | Needed by |
|---|---|
| PostgreSQL | `auth-service`, `sms-service` |
| Redis | `auth-service` (Prometheus metrics storage adapter), `worker` (consumer group tests) |

`sms-service`'s tests additionally expect `auth-service`'s migrations already run against the *same* database (see [Architecture: Database migrations](architecture.md#database-migrations)) — its own schema (`messages`, `templates`) is owned and created by `auth-service`, not by `sms-service` itself.

## Per-service commands

### gateway (Go)

```sh
cd gateway
go vet ./...
go test ./...
```

No external services required — all tests use `httptest` fakes.

### worker (Go)

```sh
cd worker
go vet ./...
go test ./...
```

Requires a real Redis (consumer-group tests create and read from an actual stream).

### auth-service (Laravel)

```sh
cd auth-service
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --force   # against a real Postgres
php artisan test
```

Requires Postgres and Redis both up and reachable via this service's `.env`.

### sms-service (NestJS)

```sh
cd sms-service
npm ci
npm run build
npm run test:cov   # unit tests + coverage gate (90% statements/lines, 90% functions, 80% branches)
npm run test:e2e   # integration tests against a real Postgres
```

Requires Postgres, with `auth-service`'s migrations already applied to it (see above). `npm run test:cov`'s coverage thresholds are enforced — a passing test run with coverage below any of the four numbers still fails the command.

### ai-service (FastAPI)

```sh
cd ai-service
python -m pip install -r requirements-dev.txt
pytest
```

No external services required.

### dashboard (React)

```sh
cd dashboard
npm ci
npm run lint
npm run build
```

There is no dashboard unit/component test suite — `lint` + a successful production `build` are what's enforced. If you're changing dashboard behavior, verify it manually against a running stack (see [Getting Started](getting-started.md)).

### SDKs

Each has its own suite and its own README with exact commands: [PHP](sdk-php.md), [Go](sdk-go.md), [Node.js](sdk-nodejs.md), [Python](sdk-python.md). None require external services (all mock the HTTP transport).

## Running everything at once

There's no single top-level "test all" command — run each service's block above in its own directory. If you have Postgres and Redis running locally, this is a reasonable order (auth-service's migration first, since sms-service depends on its schema):

```sh
(cd auth-service && composer install && php artisan migrate --force && php artisan test)
(cd sms-service && npm ci && npm run test:cov && npm run test:e2e)
(cd gateway && go test ./...)
(cd worker && go test ./...)
(cd ai-service && pytest)
(cd dashboard && npm ci && npm run lint && npm run build)
```

## What CI does

`.github/workflows/ci.yml` runs a job per service (plus one covering all four SDKs) on every push/PR, each provisioning exactly the services it needs (Postgres for `auth-service`/`sms-service`; Redis for `auth-service`/`worker`) as GitHub Actions service containers. `lint` (editorconfig) runs first and gates every other job — a formatting violation blocks all test jobs from running at all, not just from passing. On a `v*` tag push, a `publish-images` job runs after every test job succeeds, then `deploy-staging`. See [Container Registry](registry.md) and [Production Deployment](production-deployment.md) for what those two do.

## Related documentation

- [CONTRIBUTING.md](https://github.com/jmrashed/SMSPit/blob/main/CONTRIBUTING.md) — commit/PR conventions
- [Load Testing](load-testing.md) — a different kind of test (throughput, not correctness)
- [QA Pass](qa-pass.md) — a manual, whole-stack verification pass
