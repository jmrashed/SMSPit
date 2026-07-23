# Load testing (Day 88)

Baseline load test for sms-service and the gateway, run locally (no Docker in this environment — Postgres/Redis were already running as host services; auth-service/sms-service/gateway were started via `scripts/dev-up.sh`). Scripts: [scripts/load-test/](../scripts/load-test/).

## Setup

- Locust 2.46.1, run headless: `-u 30 -r 10 -t 45s` (30 users, ramping up 10/s, for 45 seconds) against the gateway (`http://127.0.0.1:8080`).
- Traffic mix per the locustfile's task weights: 5 `POST /api/v1/messages` : 3 `GET /api/v1/messages` : 1 `GET /api/v1/statistics`, roughly modeling a client that captures messages more often than it browses the inbox.
- ai-service and worker were not running (out of scope for this stack slice) — sms-service's `AiClient`/`QueuePublisher` correctly degrade to no-op on both being unreachable (Day 68/78's non-blocking design), confirmed by `ai-service unreachable` warnings in the logs with no added latency.

## Baseline (before any fix)

```
Aggregated: 84 reqs, 0 failures, median 14000ms, avg 12618ms, 1.9 req/s
```

Every single request -- `GET`, `POST`, regardless of endpoint -- clustered at almost exactly the same ~14s response time regardless of percentile (50th through 100th). That flat percentile curve is the signature of strict serialization (one request being fully processed before the next starts), not normal queueing under load (which would show a spread).

## Root cause

Isolating each hop confirmed it wasn't sms-service, Redis, or Postgres: a burst of concurrent `curl` requests straight to **auth-service alone** (`GET /api/api-keys/validate`, no sms-service or gateway involved) reproduced the identical staircase -- each concurrent request finishing about 0.23s after the last, i.e. one at a time.

`scripts/dev-up.sh` starts auth-service with `php artisan serve`, which wraps PHP's built-in development server -- single-threaded by default. Since **both** the gateway (Day 39) and sms-service (Day 35) independently validate every request against auth-service (defense in depth), auth-service's single-request-at-a-time ceiling throttles the entire stack, not just its own routes.

Laravel's `ServeCommand` does support spawning multiple workers via the `PHP_CLI_SERVER_WORKERS` env var -- but silently ignores it and falls back to one worker unless `--no-reload` is also passed (confirmed via the framework source, `vendor/laravel/framework/.../ServeCommand.php`, and reproduced directly: setting the env var without the flag logs `Unable to respect the PHP_CLI_SERVER_WORKERS environment variable without the --no-reload flag` and only one PHP process starts).

This is a **dev-only gap** -- the shipped `auth-service/Dockerfile` already runs php-fpm + nginx (real concurrency, verified in Days 48/82), so production/Compose/Kubernetes deployments were never affected. `php artisan serve` is a convenience the dev script added on top for a Docker-less workflow, and that's where the regression lived.

## Fix

`scripts/dev-up.sh` now starts auth-service as:

```sh
PHP_CLI_SERVER_WORKERS="${AUTH_SERVICE_WORKERS:-8}" php artisan serve --no-reload --port="$AUTH_SERVICE_PORT"
```

Verified directly: 8 concurrent `curl`s to `/api/api-keys/validate` that previously staircased over ~1.9s now all return within ~0.7-0.9s of each other (real concurrency, not zero latency -- 8 workers still queue past 8 concurrent requests, same as any fixed worker pool).

## After the fix

```
Aggregated: 363 reqs, 63 failures (17%), median 3200ms, avg 2949ms, 8.2 req/s
```

~7x the throughput, latency down from a 14s floor to a ~3.2s median. The 63 failures are all `429 RATE_LIMITED` from the gateway's Day 86 per-org rate limiter (default 300 req/min per tenant) correctly rejecting a single test API key being hammered by 30 simulated concurrent users -- expected behavior for this test's traffic shape, not a regression; a real deployment would spread this load across many orgs/keys.

Remaining ~3s median latency at 30 concurrent users against 8 auth-service workers is consistent with a fixed-size worker pool queueing past its own concurrency limit -- a real deployment's php-fpm pool (`pm.max_children`, Day 82's Helm chart exposes this) should be sized to expected concurrent auth-service load, same as any pool-backed service. Not chased further here since it's a known, tunable ceiling rather than a code defect, and this environment (single laptop-class host, no Docker) isn't representative of a k8s deployment's expected instance count/pool sizing.

## Raw results

`scripts/load-test/results/baseline_stats.csv` (before) and `after-fix_stats.csv` (after) hold the full Locust CSV output for reference.
