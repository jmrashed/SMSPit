# worker

Background job consumer (Go) — processes async queue jobs, including AI service calls.

**Status:** Wired to the queue (Day 78) — consumes `sms-service`'s `sms.messages.created` Redis Stream via a consumer group and calls `ai-service`'s `/classify` for each message. See [docs/redis.md](../docs/redis.md) for the channel convention and how this fits alongside `sms-service`'s own synchronous AI enrichment on capture.

## Local development

Requires Redis and `ai-service` reachable:

```bash
cp .env.example .env
go run ./cmd/worker
```

## Tests

```bash
go test ./...
```

`internal/consumer`'s tests exercise the real local Redis (`127.0.0.1:6379`) end-to-end: seed a stream entry, consume it, assert it's acked.
