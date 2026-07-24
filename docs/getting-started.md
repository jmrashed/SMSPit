# Getting Started

A step-by-step walkthrough from a fresh clone to seeing a captured message in the dashboard. For the full command reference (per-service install/run commands, troubleshooting), see [Local Development Reference](local-dev-setup.md) — this page is the guided first run.

## 1. Prerequisites

You'll need, for the no-Docker path this guide uses:

- Git
- PHP 8.3+ with `composer`
- Node.js 20+ with `npm`
- Go 1.22+
- Python 3.12+ (only if you also want `ai-service` running — optional for this walkthrough)
- A running PostgreSQL instance and a running Redis instance, reachable at their defaults (`127.0.0.1:5432` / `127.0.0.1:6379`)

Prefer Docker instead? See [Production Deployment: Docker Compose](production-deployment.md#docker-compose-single-host) — `docker compose up -d` brings up all 8 services (including Postgres/Redis themselves) in one step. The rest of this page assumes the no-Docker path.

## 2. Clone the repository

```sh
git clone https://github.com/jmrashed/SMSPit.git
cd SMSPit
```

## 3. Configure environment variables

```sh
./scripts/setup.sh
```

Copies `.env.example` → `.env` at the root and for every service, then installs each service's dependencies (`composer install`, `npm install`, `go mod download`, `pip install`). Safe to re-run — it never overwrites an existing `.env`.

## 4. Start the services

```sh
./scripts/dev-up.sh
```

This starts `auth-service`, `sms-service`, `gateway`, and `dashboard` together (needs the Postgres/Redis from step 1 already running), waits for each to report healthy, and — the first time you run it — creates a dev user and a dev API key for you automatically.

## 5. Verify service health

`dev-up.sh` does this for you and prints a summary, but to check by hand:

```sh
curl http://127.0.0.1:8000/api/health   # auth-service
curl http://127.0.0.1:3001/api/v1       # sms-service
curl http://127.0.0.1:8080/healthz      # gateway
```

Each should return a `200` with a small JSON body.

## 6. Get your API key

`dev-up.sh` prints a dev API key and also saves it to `.dev-logs/dev-api-key.txt`:

```sh
export SMSPIT_API_KEY="$(cat .dev-logs/dev-api-key.txt)"
```

(If you're setting this up manually instead: `POST /auth/api-keys` with a `name` and `owner_id` — see [auth-service](auth-service.md#api).)

## 7. Send your first message

```sh
curl -X POST http://127.0.0.1:8080/api/v1/messages \
  -H "Authorization: Bearer $SMSPIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+8801700000000", "from": "SMSPit", "message": "Your OTP is 123456"}'
```

You should get back a `201` with the captured message, including its generated `id` (e.g. `sms_abc123`).

## 8. View it in the dashboard

Open `http://localhost:5173` in a browser — the message you just sent should already be in the inbox (pushed there live over WebSocket the moment it was captured, no refresh needed). Click it to see the detail view, including the AI-detected OTP badge.

## 9. Replay it

From the message detail view, click **Replay** — this creates a new, linked message with the same `to`/`from`/body, which appears in the inbox immediately. Or via the API:

```sh
curl -X POST http://127.0.0.1:8080/api/v1/messages/<id>/replay \
  -H "Authorization: Bearer $SMSPIT_API_KEY"
```

## 10. View statistics

Click **Statistics** in the dashboard nav, or:

```sh
curl http://127.0.0.1:8080/api/v1/statistics -H "Authorization: Bearer $SMSPIT_API_KEY"
```

## 11. Stop and restart

Press `Ctrl+C` in the terminal running `dev-up.sh` — it stops every service it started. Postgres/Redis (started outside the script) keep running. Re-run `./scripts/dev-up.sh` any time to bring the four services back up; it reuses the same dev API key from `.dev-logs/dev-api-key.txt` rather than creating a new one.

## Next steps

- [Local Development Reference](local-dev-setup.md) — every service's manual install/run commands
- [REST API](https://github.com/jmrashed/SMSPit#rest-api) / [OpenAPI Reference](openapi/site/index.html) — the full contract
- [Provider Compatibility](api/provider-compatibility.md) — point an existing provider SDK at SMSPit instead of calling the native API directly
- [Troubleshooting](troubleshooting.md) — if something above didn't work
