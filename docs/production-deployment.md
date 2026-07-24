# Production Deployment Guide

Two supported paths: `docker-compose.yml` for a single-host deployment, or the Helm chart for Kubernetes. Both wire up the same 8-service topology (`gateway`, `auth-service`, `sms-service`, `ai-service`, `worker`, `dashboard`, Postgres, Redis).

**Neither path has been run end-to-end in this working environment** — no Docker/Podman/kubectl/helm binary is available here (see [docs/registry.md](registry.md) and [deployments/k8s/README.md](https://github.com/jmrashed/SMSPit/blob/main/deployments/k8s/README.md#status) for the specifics of what *was* verified per-service instead: each Dockerfile builds via the host toolchain, `docker-compose.yml`'s ports/env wiring was replicated with live host processes, and the Kubernetes manifests were validated by parsing, not by a real `kubectl apply`). Treat this guide as reviewed-for-correctness, not run-and-confirmed; re-verify the first real deploy against it.

## Docker Compose (single host)

1. Copy `.env.example` to `.env` and fill in real values — at minimum `POSTGRES_PASSWORD` (never leave it as the default `smspit`) and `DASHBOARD_API_KEY` (generate via `POST /auth/api-keys` after the stack is up once, then set it and restart the `dashboard` service).
2. `docker compose up -d --build` (or `docker compose pull` once images are published, then `docker compose up -d` without `--build`).
3. Point real traffic at the `gateway` service's port (`GATEWAY_PORT`, default 8080) — it's the only service meant to be externally reachable alongside `dashboard`; `sms-service`/`auth-service` should stay on the internal Compose network only (they're published to the host in the default `docker-compose.yml` for local dev convenience — remove those host port mappings in a production override file).
4. Put a reverse proxy with TLS (nginx, Caddy, Traefik) in front of `gateway` and `dashboard` — neither terminates TLS itself.
5. Back up the `postgres_data` volume on whatever schedule your data retention policy requires; SMSPit itself has no built-in backup mechanism.

### Scaling notes (Compose)

Compose doesn't give you real horizontal scaling of stateful replicas out of the box — `docker compose up -d --scale sms-service=3` works for the stateless services (`gateway`, `sms-service`, `worker`, `ai-service`) since they hold no local state, but you'd need an external load balancer in front since Compose has no built-in one. For anything beyond a single beefy host, use the Kubernetes path instead.

## Kubernetes (Helm)

1. Publish images first (see [Container Registry](registry.md)) — the chart's default `image.repository` values now point at `ghcr.io/jmrashed/smspit-*` (fixed in this change; they previously pointed at unpublished `smspit/*` names, which would have silently failed to pull).
2. Install with real secrets, never the checked-in placeholders:
   ```sh
   helm install smspit deployments/helm/smspit \
     --set secrets.postgresPassword=<real password> \
     --set secrets.dashboardApiKey=<real key> \
     --set dashboard.externalUrls.apiBaseUrl=https://api.yourdomain.com \
     --set dashboard.externalUrls.authServiceUrl=https://auth.yourdomain.com \
     --set authServiceAppUrl=https://auth.yourdomain.com
   ```
3. `dashboard.externalUrls.*` and `authServiceAppUrl` **must** be real externally-reachable hostnames (behind your ingress/LoadBalancer) — the dashboard is a browser-side SPA, so `localhost` only works when port-forwarding to a single machine, not in a real cluster (see the chart's own `values.yaml` comments).
4. Add an Ingress in front of `gateway`'s and `dashboard`'s Services for TLS termination and real hostnames — not included in the chart itself (the chart uses `LoadBalancer` Services for both, which is enough for a cloud provider's own L4 load balancer, but you still want L7 TLS/routing on top for anything public).
5. Point Postgres/Redis at managed services instead of the chart's in-cluster StatefulSets for anything beyond a demo/staging deployment — the chart's `postgres`/`redis` are convenience defaults, not meant to be the production data layer for a real deployment (no replication, no managed backups).

### Scaling notes (Kubernetes)

- `gateway`, `sms-service`, `ai-service`, `worker`, `dashboard` are stateless — raise `<service>.replicaCount` for any of them freely; `auth-service` too, since PHP-FPM workers are stateless per-request (sessions aren't used — see [docs/security.md](security.md), auth is per-API-key, not session-based).
- `worker` consumes Redis Streams via a consumer group (`worker/internal/consumer/consumer.go`) — multiple replicas is safe, since each replica in the same group gets a distinct share of the stream rather than reprocessing the same messages.
- The gateway's per-org rate limit (`RATE_LIMIT_PER_MINUTE`) is **per gateway instance**, not cluster-wide — it's an in-memory fixed-window counter (see [Rate Limiting](rate-limiting.md)). Running N gateway replicas behind a load balancer effectively multiplies the real per-org quota by N, since each instance tracks its own counts. Fine at small N; if you scale the gateway significantly, move the limiter to a shared store (Redis) instead of assuming today's in-memory version enforces a hard global cap.
- Bump `resources.requests`/`resources.limits` per service in `values.yaml` based on your own load-testing baseline (the [load testing](load-testing.md) numbers were measured on a single dev laptop with no Docker, not representative of real infrastructure sizing — re-run `scripts/load-test/` against your actual target environment before picking numbers).

## Environment variable reference

| Variable | Used by | Purpose |
|---|---|---|
| `GATEWAY_PORT` | gateway, docker-compose | External port for the gateway (default 8080) |
| `SMS_SERVICE_URL` | gateway | Internal URL to sms-service |
| `AUTH_SERVICE_URL` | gateway, sms-service | Internal URL to auth-service |
| `CORS_ORIGIN` | gateway, sms-service | Allowed origin for browser requests (set to the real dashboard origin in production, not `*`) |
| `RATE_LIMIT_PER_MINUTE` | gateway | Per-org request quota, see [Rate Limiting](rate-limiting.md) and the scaling caveat above |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | gateway, sms-service, auth-service, ai-service, worker | OTLP collector endpoint, see [Observability](observability.md); leave unset to disable tracing |
| `AUTH_SERVICE_PORT`, `SMS_SERVICE_PORT`, `AI_SERVICE_PORT`, `DASHBOARD_PORT` | docker-compose | Host-side port mappings for local/dev use |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | postgres, auth-service, sms-service | Database credentials -- always override the password in production |
| `REDIS_PORT` | redis, sms-service, worker | Queue/pub-sub connection |
| `DASHBOARD_API_KEY` | dashboard | API key the dashboard container authenticates with |
| `AI_SERVICE_URL` | sms-service, worker | Internal URL to ai-service; unset degrades OTP/spam/classification to "not detected" rather than failing captures |

Full list with defaults: [.env.example](https://github.com/jmrashed/SMSPit/blob/main/.env.example) (Compose) and [deployments/helm/smspit/values.yaml](https://github.com/jmrashed/SMSPit/blob/main/deployments/helm/smspit/values.yaml) (Helm).
