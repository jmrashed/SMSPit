# Observability

## Tracing (Day 83)

OpenTelemetry, exported via OTLP/HTTP to a collector. `docker-compose.yml` wires up Jaeger's all-in-one image (OTLP receiver on `:4318`, trace UI on `:16686`) as that collector; any OTLP/HTTP-compatible collector works.

Every backend service reads `OTEL_EXPORTER_OTLP_ENDPOINT` and is a no-op (nothing exported, no startup failure) if it's unset — same non-blocking-by-default philosophy as this project's other optional integrations (`AiClient`, `QueuePublisher`). `gateway`/`worker` (Go) expect a bare `host:port`; `sms-service`/`ai-service`/`auth-service` expect a full URL (`http://host:port`) since each appends `/v1/traces` itself. See `docker-compose.yml` for both forms in context.

| Service | Instrumentation |
|---|---|
| `gateway` (Go) | `otelhttp` wraps the router (inbound spans) and each backend's reverse-proxy `Transport` (outbound spans + trace-context propagation) |
| `auth-service` (Laravel) | `TraceRequest` middleware — extracts an inbound `traceparent`, starts a span, exports synchronously (`SimpleSpanProcessor`, since classic php-fpm has no background thread to flush a batch on) |
| `sms-service` (NestJS) | `@opentelemetry/sdk-node` with `HttpInstrumentation`, `ExpressInstrumentation`, `NestInstrumentation` (inbound + framework-level spans) and `UndiciInstrumentation` (outbound — `AuthClient`/`AiClient`/`QueuePublisher` all use native `fetch`, which only `UndiciInstrumentation` patches, not `HttpInstrumentation`) |
| `ai-service` (FastAPI) | `FastAPIInstrumentor` (inbound spans only — it makes no outbound calls of its own) |
| `worker` (Go) | Manual span per consumed queue entry (`worker.process_message`) wrapping the `ai-service` call. Doesn't continue the capture request's trace — the Redis Stream entry (Day 78) carries no `traceparent`, so there's nothing to extract; it's a real, separately-rooted trace, not a continuation |

**Verified end-to-end** (2026-07-21, this environment): a real `POST /api/v1/messages` through `gateway` produced one trace ID shared across `gateway` → `auth-service` (API-key validation) → `ai-service` (`/detect-otp`, `/classify`, `/detect-spam`), with `sms-service`'s own nested controller/service spans also exported (batched — allow ~5s for `BatchSpanProcessor`'s default flush interval before checking a collector). Verified against a throwaway Go program that decodes real OTLP protobuf/JSON payloads, since neither `docker`/`podman` nor a real Jaeger instance were available in this environment — re-verify against `docker-compose.yml`'s actual `jaeger` service wherever Docker is available.

### Local development

```bash
# Point a service at any reachable OTLP/HTTP collector:
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318   # sms-service/ai-service/auth-service
export OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4318           # gateway/worker
```

Leave it unset to disable tracing entirely (the default for `scripts/dev-up.sh`).

## Metrics (Day 84)

Every backend service exposes `GET /metrics` in Prometheus text exposition format. `docker-compose.yml` wires up `prom/prometheus`, scraping all five per [`docker/prometheus/prometheus.yml`](../docker/prometheus/prometheus.yml); Prometheus's UI/API is on `:9090`.

| Service | Library | Notes |
|---|---|---|
| `gateway` (Go) | `prometheus/client_golang` | `gateway_http_requests_total`, `gateway_http_request_duration_seconds`, labeled by chi's matched route pattern (not the raw path) |
| `auth-service` (Laravel) | `promphp/prometheus_client_php` | `auth_service_http_requests_total`/`..._duration_seconds`, **Redis-backed storage** — classic php-fpm spawns multiple worker processes with separate memory, so an in-memory counter would only reflect whichever worker handled the scrape, not the sum across all of them |
| `sms-service` (NestJS) | `prom-client` | `sms_service_http_requests_total`/`..._duration_seconds` plus Node.js default process metrics (heap, GC, event loop); `GET /metrics` sits outside the `/api/v1` prefix, same as `/providers/*` |
| `ai-service` (FastAPI) | `prometheus-fastapi-instrumentator` | Auto-instruments every route; also exposes request-size histograms out of the box |
| `worker` (Go) | `prometheus/client_golang` | `worker_messages_processed_total{outcome}`, `worker_message_processing_duration_seconds` — served on its own small HTTP server (`:9100` by default, `WORKER_METRICS_ADDR`), since worker otherwise has no HTTP surface |

Metrics are unconditional (no env var gates them off, unlike tracing) — a `/metrics` scrape target is expected to always be present once a service is up, so there's no "unset means disabled" story here.

**Verified end-to-end** (2026-07-21): a real Prometheus 2.55.1 binary (downloaded directly — no Docker needed, unlike Jaeger) scraped all five services running locally, confirming every target reports `up` and every dashboard query below (Days 84+85) returns real, non-empty data from live traffic sent through the gateway.

## Dashboards (Day 85)

`docker-compose.yml` wires up `grafana/grafana`, auto-provisioned (no manual "Add data source" or dashboard import click-through):

- [`docker/grafana/provisioning/datasources/prometheus.yml`](../docker/grafana/provisioning/datasources/prometheus.yml) — points Grafana at the `prometheus` service, set as default
- [`docker/grafana/provisioning/dashboards/dashboards.yml`](../docker/grafana/provisioning/dashboards/dashboards.yml) — loads every dashboard JSON under `docker/grafana/dashboards/`
- [`docker/grafana/dashboards/smspit-overview.json`](../docker/grafana/dashboards/smspit-overview.json) — six panels: request rate, P95 latency, and error rate (all per-service, one query per `gateway`/`sms-service`/`auth-service`/`ai-service`), worker's processed-message rate by outcome, message volume by classification category, and OTP detection rate

Grafana's UI is on `:3001` (`GRAFANA_PORT`) with `GF_AUTH_ANONYMOUS_ENABLED=true` (Viewer role) — convenient for a local self-hosted dev sandbox, matching this project's other "no auth needed to look" defaults (e.g. the provider-compat endpoints), but **turn this off** (`GF_AUTH_ANONYMOUS_ENABLED=false`) before exposing this port beyond your own machine.

**Verified end-to-end** (2026-07-21): all 6 panels' underlying PromQL queries were run directly against a real local Prometheus scraping live services (see Metrics section above) — every query returned real data, including the `category="otp"` breakdown and `outcome="success"` from `worker` actually processing a queued message end-to-end. Not yet rendered in an actual Grafana UI — `docker`/`podman` were unavailable in this environment, and no standalone Grafana binary/verification was attempted beyond confirming the underlying queries and provisioning YAML are correct; re-verify the dashboard renders as expected (panel layout, legends, units) wherever Docker is available.
