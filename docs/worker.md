# worker

Background job consumer — handles async processing off the request path, primarily AI enrichment of captured messages.

## Stack

| Layer | Technology |
|---|---|
| Language | Go |
| Queue | Redis Streams / NATS / Kafka (TBD at implementation) |
| Deployment | Docker, Kubernetes |

## Status

Not yet implemented. Planned for v0.4 — see [checklist.md](../checklist.md) Days 77–78.

## Responsibilities

- Consume jobs published by `sms-service` on message capture
- Call `ai-service` for OTP detection, classification, and spam scoring
- Write enrichment results back to the message record
- Handle retries/failures without blocking the capture path

## Planned Features & Functionality

| Feature | Description |
|---|---|
| Job consumption | Long-running consumer loop with graceful shutdown |
| AI enrichment orchestration | Calls `ai-service` endpoints per queued message |
| Async by design | Keeps `sms-service`'s capture endpoint fast; AI results arrive slightly after capture |

## Directory layout (planned)

```
worker/
├── cmd/worker/main.go
├── internal/
│   ├── consumer/
│   └── jobs/
├── Dockerfile
└── go.mod
```

## Depends on

- `ai-service` (enrichment calls)
- Redis/NATS/Kafka (job queue, published by `sms-service`)

## Depended on by

- No direct callers — writes results back to `sms-service`'s data store
