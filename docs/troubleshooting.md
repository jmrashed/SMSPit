# Troubleshooting

Practical fixes for common problems, organized by area. See also [FAQ](faq.md) for conceptual questions and [Getting Started](getting-started.md) for the first-run walkthrough this assumes you've done.

## Docker / Docker Compose

- **A service fails to start in `docker compose up`**: check `docker compose logs <service>` first. Most startup failures are a missing/misconfigured env var (see the [environment variable reference](production-deployment.md#environment-variable-reference)) or the database not being ready yet — Compose's `depends_on` doesn't wait for Postgres to finish initializing, only for its container to start.
- **Port already in use**: another process (or a previous `docker compose up` that wasn't torn down) is holding a port SMSPit wants. Run `docker compose down` first, or override the conflicting `*_PORT` variable in `.env`.
- **This documentation set was built without Docker available** — the Compose/Kubernetes paths were reviewed for correctness but not run end-to-end here (see [CHANGELOG.md](changelog.md#known-gaps)). If something in this section turns out wrong against a real Docker install, that's expected until someone verifies it for real.

## Environment configuration

- **A service's `.env` already exists and won't update**: `scripts/setup.sh` never overwrites an existing `.env` — delete it first if you want it regenerated from `.env.example`.
- **`composer install` fails with missing `ext-dom`/`ext-xml`**: install the PHP `dom` and `xml` extensions for your PHP version (e.g. `sudo apt install php-xml` on Debian/Ubuntu), or run with `composer install --ignore-platform-req=ext-dom --ignore-platform-req=ext-xml` if you only need to typecheck/lint rather than run the app.

## Database connection issues

- **`sms-service`/`auth-service` can't reach Postgres**: confirm `DB_HOST`/`DB_PORT`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` match a Postgres instance that's actually running and accepting connections (`pg_isready -h $DB_HOST -p $DB_PORT`).
- **`sms-service` tests fail with a schema-related error**: `auth-service` owns all migrations, including the `messages`/`templates` tables `sms-service` reads and writes (see [Architecture: Database migrations](architecture.md#database-migrations)). Run `auth-service`'s migration against the same database `sms-service` is pointed at before running `sms-service`'s own test suite — see [Testing](testing.md).

## Redis connection issues

- **`worker` or `auth-service` tests fail with a Redis connection error**: both need a real Redis to pass their own test suites (`auth-service`'s Prometheus metrics use a Redis-backed storage adapter; `worker`'s tests create a real consumer group) — this isn't optional for testing, only at runtime does `sms-service`'s side degrade gracefully. Start Redis first (`redis-server`, or `docker run -p 6379:6379 redis:7-alpine`).
- **Captures work but nothing shows up for `worker`**: `sms-service` publishes to Redis Streams on capture, but degrades to a no-op if Redis is unreachable rather than failing the capture — check `REDIS_HOST`/`REDIS_PORT` on `sms-service` if `worker` never seems to receive anything. See [Redis and Queues](redis.md).

## API authentication errors (`401`)

- **`Missing Authorization header` / `Invalid or revoked API key`**: the gateway couldn't validate your key against `auth-service`. Confirm the header is exactly `Authorization: Bearer <key>.<secret>` (both halves, joined by a literal `.`), and that the key hasn't been revoked or rotated (a rotated key's old half stops working immediately — see [API Key Rotation](api-key-rotation.md)).
- **Works calling `sms-service` directly but not through the gateway (or vice versa)**: both independently validate the same key against `auth-service` (defense in depth) — if one accepts it and the other doesn't, check that both point at the same `auth-service` instance/database.

## API validation errors (`400`/`422`)

- **`400` from sms-service**: a field failed `class-validator` checks — the response body's `details` array names which field(s) and why. Common ones: `message`/`body` over 1600 chars, `to`/`from` over 32 chars.
- **`422` from auth-service**: a Laravel `FormRequest` rejected the input — same idea, check the response's `errors` object for the specific field.

## Gateway errors

- **`502 Bad Gateway`**: the gateway couldn't reach the upstream it was proxying to (`sms-service` or `auth-service` is down, or `SMS_SERVICE_URL`/`AUTH_SERVICE_URL` points somewhere wrong).
- **`429 Too Many Requests`**: per-org rate limit hit — see [Rate Limiting](rate-limiting.md) for the response shape and how to raise the limit.
- **A `/providers/*` request 404s through the gateway**: confirm you're on a version with the provider-adapter route fix (`v1.0.0`+) — this was a real bug found in the QA pass (see [qa-pass.md](qa-pass.md)) where these routes were missing entirely on the gateway for a period.

## SMS provider (adapter) issues

- **My existing provider SDK doesn't work against SMSPit**: provider-compatible adapters intentionally accept no SMSPit API key (see [Provider Compatibility](api/provider-compatibility.md)) — don't send an `Authorization` header at all for these; the real provider SDK won't be sending SMSPit's format anyway.
- **MessageBird/Vonage/SNS adapter returns an unexpected shape**: each adapter mimics that provider's *actual* response shape (including MessageBird/Vonage's JSON conventions and SNS's XML), not SMSPit's native JSON envelope — see [Provider Compatibility](api/provider-compatibility.md#unsupported) for what's a known gap (e.g. bulk/multi-recipient sends aren't supported; only the first recipient is captured).

## Worker / queue issues

- **`worker` logs "failed to create consumer group, will keep retrying"**: Redis is unreachable or the stream doesn't exist yet — this is expected on a fresh start before any message has been captured (the stream is created on first publish) and worker retries automatically.
- **Messages aren't reflected differently after `worker` processes them**: this is expected, not a bug — worker currently only classifies and logs, it does not write results back to the message record. See [worker.md#current-behavior](worker.md#current-behavior).

## AI service issues

- **OTP/category/spam are always `null`**: `ai-service` is unreachable or `AI_SERVICE_URL` is unset on `sms-service` — this degrades gracefully by design (never fails a capture), so check `sms-service`'s logs for `ai-service unreachable` warnings.
- **Enrichment is slow**: `sms-service`'s call to `ai-service` has a 2-second timeout; if `ai-service` is up but slow, captures will still succeed but enrichment will be `null` once the timeout fires.

## Dashboard connection issues

- **Dashboard loads but shows no data / network errors in the console**: check `VITE_API_BASE_URL` and `VITE_AUTH_SERVICE_URL` point at your actual gateway/auth-service URLs, and that `VITE_API_KEY` (if used for local dev) is a valid, unrevoked key.
- **Real-time updates don't appear**: check the browser's network tab for the WebSocket connection — a `4001` close code means the token was missing/invalid (see [WebSocket API](websocket.md)).

## Common port conflicts

Default ports: gateway `8080`, auth-service `8000`, sms-service `3000` (or `3001` via `scripts/dev-up.sh`, to avoid colliding with other local dev servers), dashboard `5173`, ai-service `8001`, Postgres `5432`, Redis `6379`. Override any of these via the corresponding `*_PORT` env var if something else on your machine already uses it.

## Common local development problems

- **`scripts/dev-up.sh` hangs or fails to become healthy**: check `.dev-logs/*.log` for the specific service that failed — the script waits for each service's health check before moving on and reports which one timed out.
- **Everything is very slow under concurrent load in local dev**: a known, fixed issue — see [Load Testing](load-testing.md) for the root cause (PHP's built-in dev server is single-threaded by default) and the fix already applied in `scripts/dev-up.sh`.
