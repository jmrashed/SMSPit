# worker

**Status: Implemented** as a working demonstration of the async processing path — see [Current behavior](#current-behavior) below for exactly what that means and doesn't mean.

## Stack

| Layer | Technology |
|---|---|
| Language | Go |
| Queue | Redis Streams, consumer group (`XREADGROUP`/`XACK`) — see [Redis and Queues](redis.md) |
| Deployment | Docker, Kubernetes (see [Kubernetes](kubernetes.md) / [Helm](helm.md)) |

## Responsibilities

- Consume `sms.messages.created` stream entries published by [sms-service](sms-service.md) on capture
- Call [ai-service](ai-service.md)'s `/classify` endpoint for each entry
- Record processing metrics and an OpenTelemetry span per message
- Shut down gracefully on `SIGINT`/`SIGTERM`, letting in-flight work finish

## Current behavior

**Worker classifies and logs — it does not write results back to the message record.** `worker/internal/consumer/consumer.go`'s `process()` method calls `ai-client.Classify()`, records a Prometheus metric and a trace span, and logs the result — it never calls back into `sms-service` or touches the database. The OTP/category/spam tags a user actually sees in the dashboard come entirely from `sms-service`'s own **synchronous** enrichment on capture (see [sms-service](sms-service.md#responsibilities)), not from worker.

This means worker today demonstrates the async consumption path (consumer group, `XREADGROUP`/`XACK`, graceful shutdown) rather than providing a second, asynchronous source of truth for message enrichment. If a future change adds a write-back call, update this section and [architecture.md](architecture.md#request-flow) together.

## Configuration

| Env var | Purpose |
|---|---|
| `REDIS_HOST`, `REDIS_PORT` | Stream connection |
| `AI_SERVICE_URL` | Classification calls |
| `WORKER_POLL_INTERVAL` | `XREADGROUP` block duration |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint, see [Observability](observability.md) |

## Directory layout

```
worker/
├── cmd/worker/main.go
├── internal/
│   ├── consumer/     # Run(), readAndProcess(), process()
│   ├── queue/         # Redis client, consumer-group setup
│   ├── aiclient/       # ai-service HTTP client
│   ├── metrics/         # Prometheus
│   └── telemetry/        # OpenTelemetry setup
├── config/
├── Dockerfile
└── go.mod
```

## Testing

```sh
cd worker
go vet ./...
go test ./...   # needs a real Redis for the consumer-group tests
```

See [Testing](testing.md) for the full-repo picture and how CI provisions Redis for this job.

## Related documentation

- [Architecture Overview](architecture.md)
- [Redis and Queues](redis.md) — the stream/consumer-group design this consumes
- [ai-service](ai-service.md) — the only service worker calls
- [Observability](observability.md)

## Depends on

- [ai-service](ai-service.md) (classification calls)
- Redis (job queue, published by [sms-service](sms-service.md))

## Depended on by

- No direct callers — see [Current behavior](#current-behavior) for why this isn't yet "writes results back to sms-service's data store"
