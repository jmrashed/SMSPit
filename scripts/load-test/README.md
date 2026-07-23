# Load testing (Day 88)

[Locust](https://locust.io/) scripts exercising the gateway's public surface the way a real client would: capture a message, list the inbox, check statistics. See `locustfile.py`.

## Running

```sh
# 1. Start the stack without Docker (see scripts/dev-up.sh), or use docker compose.
./scripts/dev-up.sh &

# 2. Install locust once (a venv keeps it out of the system Python):
python3 -m venv .venv-locust && .venv-locust/bin/pip install locust

# 3. Run against the gateway, using the dev API key dev-up.sh printed/saved:
API_KEY="$(cat .dev-logs/dev-api-key.txt)" \
  .venv-locust/bin/locust -f scripts/load-test/locustfile.py \
  --host http://127.0.0.1:8080 --headless -u 30 -r 10 -t 45s \
  --csv scripts/load-test/results/run
```

Swap `--host` for the Kubernetes/Compose gateway URL to load-test a real deployment. Raise `-u`/`-r` for a heavier run once the target has real backing infra (a bare dev Postgres/Redis on a laptop will bottleneck before the app code does).

## Baseline results and the bottleneck found

Full findings: [docs/load-testing.md](../../docs/load-testing.md). Summary: at 30 concurrent users, every request serialized behind auth-service (`php artisan serve`'s single-worker default) — 14s median latency, ~2 req/s. Fixing `scripts/dev-up.sh` to actually enable `PHP_CLI_SERVER_WORKERS` (Laravel's `ServeCommand` silently ignores it without `--no-reload`) dropped median latency to ~3.2s and raised throughput to ~8 req/s in the same environment. Raw before/after CSVs are in `results/`.
