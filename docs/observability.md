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

## Metrics, dashboards

Not yet implemented — Prometheus metrics land Day 84, Grafana dashboards Day 85.
