# Architecture Overview

SMSPit is a microservices platform: a Go gateway fronts two backend services (auth, SMS), which in turn call a third (AI) directly — not through the gateway — backed by PostgreSQL and Redis, with a React dashboard as the primary UI.

```
                    +----------------------+
                    |    API Gateway (Go)  |
                    +----------+-----------+
                               |
              +----------------+----------------+
              |                                  |
    +---------v------+                 +--------v-------+
    | Auth Service   |                 | SMS Service    |
    | Laravel        |                 | NestJS         |
    +----------------+                 +--------+-------+
                                                 |         \
                                                 |          \  (sync, on capture)
                                          Redis Streams   +--v------------+
                                                 |          | AI Service   |
                                        +--------v--------+ | FastAPI      |
                                        | Worker (Go)     |-+--------------+
                                        +-----------------+   ^
                                                 (async, classify only,     |
                                                  no write-back -- see      |
                                                  worker.md)  --------------+

    PostgreSQL: shared instance, schema owned by Auth Service, read/written
    directly by SMS Service (see Database migrations below)

                    +----------------------+
                    |  React Dashboard     |
                    |  (REST + WebSocket)  |
                    +----------------------+
```

See [gateway.md](gateway.md#request-routing) for the exact route table and [redis.md](redis.md) for the queue design.

## Request flow

1. **Clients** (apps under test, or SDKs) send SMS payloads to the **gateway**, either via SMSPit's native REST API or a provider-compatible adapter endpoint (Vonage, AWS SNS, MessageBird) — the latter bypass the gateway's auth check entirely (see [gateway.md](gateway.md#request-routing)).
2. The **gateway** authenticates `/api/v1/*` requests (API key, validated against **auth-service**) and routes them to **sms-service**.
3. **sms-service** calls **ai-service** synchronously (OTP/classification/spam, non-blocking, degrades gracefully if unavailable), persists the message to **PostgreSQL**, publishes a job to **Redis Streams** for `worker`, and pushes a live update over **WebSocket** — all before responding to the client.
4. The **worker** separately consumes the same queued jobs and calls **ai-service** again (classification only), but does not write results anywhere — it demonstrates the async consumption path rather than being a second source of truth. See [worker.md](worker.md#current-behavior).
5. The **dashboard** reads/searches messages via the REST API and receives live updates via WebSocket.

**`ai-service` has no gateway route** — it's never reverse-proxied; only `sms-service` and `worker` call it directly.

## Message lifecycle

```
1. POST /api/v1/messages  ──▶  gateway (auth + rate limit check)
                                  │
2.                                ▼
                              sms-service
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                          ▼
3. call ai-service         persist to Postgres        publish to Redis Stream
   (sync, 2s timeout,      (status=captured)          "sms.messages.created"
    non-blocking)                 │                          │
        │                         ▼                          ▼
4. otp/category/is_spam   broadcast over WebSocket     worker consumes async
   written on the row     to connected dashboards      (classify + log only,
                                                         see worker.md)
```

A **replay** (`POST /api/v1/messages/{id}/replay`) re-runs steps 2-4 with the original message's `to`/`from`/body, producing a new row with `replayed_from` set to the original id — it is not a re-delivery of the same row.

## Authentication flow

```
Client                  Gateway                  Auth Service           SMS Service
  │  Authorization:        │                          │                     │
  │  Bearer key.secret      │                          │                     │
  ├─────────────────────────▶                          │                     │
  │                         │  GET /api-keys/validate   │                     │
  │                         ├──────────────────────────▶                     │
  │                         │   {id, owner_id, org_id,  │                     │
  │                         │◀── scopes} or 401         │                     │
  │                         │                          │                     │
  │              sets X-Api-Key-Id / X-Owner-Id /       │                     │
  │              X-Api-Key-Scopes / X-Org-Id headers,   │                     │
  │              overwriting any client-supplied value  │                     │
  │                         ├──────────────────────────────────────────────────▶
  │                         │                          │    sms-service re-validates
  │                         │                          │    the same key itself
  │                         │                          │◀── (defense in depth)
```

Full detail: [gateway.md](gateway.md#identity-headers) and [security.md](security.md).

## Service boundaries

Each service is only reachable through its public API — no service imports or calls into another service's internals directly. Shared contracts (where needed) live in [`proto/`](https://github.com/jmrashed/SMSPit/tree/main/proto).

## Database migrations

SMSPit uses a single shared PostgreSQL instance (not database-per-service). Schema ownership is centralized rather than split per service: **`auth-service` (Laravel) is the sole owner of all migrations**, including tables used by other services (e.g. `messages`, owned at the API level by `sms-service`). Other services connect to the same Postgres instance directly as SQL clients to read/write their own tables, but never run their own migrations or alter schema.

This trades strict per-service schema ownership for one consistent migration history and tooling (`php artisan migrate`), which fits SMSPit's scope as a self-hosted dev/test tool better than coordinating migrations across Laravel, TypeORM/Prisma, and SQLAlchemy independently.

## Cross-cutting concerns (v1.0)

- **Observability:** OpenTelemetry tracing across all services, Prometheus metrics, Grafana dashboards.
- **Multi-tenancy:** All data is scoped by organization; enforced at the query layer in auth-service and sms-service.
- **Deployment:** Docker Compose for local/dev; Kubernetes + Helm for production.

See the [root README](https://github.com/jmrashed/SMSPit#roadmap) for the phased rollout of these components, and per-service docs for what's implemented (`gateway.md`, `auth-service.md`, `sms-service.md`, `ai-service.md`, `worker.md`, `dashboard.md`).
