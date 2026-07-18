# Architecture Overview

SMSPit is a microservices platform: a Go gateway fronts three backend services (auth, SMS, AI), backed by PostgreSQL, Redis, and a message queue, with a React dashboard as the primary UI.

```
                   +----------------------+
                   |    API Gateway (Go)  |
                   +----------+-----------+
                              |
          +-------------------+-------------------+
          |                   |                   |
+---------v------+   +--------v-------+   +-------v-------+
| Auth Service   |   | SMS Service    |   | AI Service    |
| Laravel        |   | NestJS         |   | FastAPI       |
+----------------+   +----------------+   +---------------+
                              |
                       Redis / NATS / Kafka
                              |
                    +---------v----------+
                    | Worker Service (Go)|
                    +---------+----------+
                              |
                        PostgreSQL
                              |
                    +---------v----------+
                    |  React Dashboard   |
                    +--------------------+
```

## Request flow

1. **Clients** (apps under test, or SDKs) send SMS payloads to the **gateway**, either via SMSPit's native REST API or a provider-compatible adapter endpoint (Vonage, AWS SNS, MessageBird, etc.).
2. The **gateway** authenticates the request (API key, validated against **auth-service**) and routes it to **sms-service**.
3. **sms-service** persists the message to **PostgreSQL**, publishes a job to the queue (**Redis/NATS/Kafka**) for async processing, and pushes a live update over **WebSocket**.
4. The **worker** consumes queued jobs and calls **ai-service** for OTP detection, classification, and spam scoring; results are written back to the message record.
5. The **dashboard** reads/searches messages via the REST API and receives live updates via WebSocket.

## Service boundaries

Each service is only reachable through its public API — no service imports or calls into another service's internals directly. Shared contracts (where needed) live in [`proto/`](../proto/).

## Database migrations

SMSPit uses a single shared PostgreSQL instance (not database-per-service). Schema ownership is centralized rather than split per service: **`auth-service` (Laravel) is the sole owner of all migrations**, including tables used by other services (e.g. `messages`, owned at the API level by `sms-service`). Other services connect to the same Postgres instance directly as SQL clients to read/write their own tables, but never run their own migrations or alter schema.

This trades strict per-service schema ownership for one consistent migration history and tooling (`php artisan migrate`), which fits SMSPit's scope as a self-hosted dev/test tool better than coordinating migrations across Laravel, TypeORM/Prisma, and SQLAlchemy independently.

## Cross-cutting concerns (v1.0)

- **Observability:** OpenTelemetry tracing across all services, Prometheus metrics, Grafana dashboards.
- **Multi-tenancy:** All data is scoped by organization; enforced at the query layer in auth-service and sms-service.
- **Deployment:** Docker Compose for local/dev; Kubernetes + Helm for production.

See the [root README](../README.md#roadmap) for the phased rollout of these components, and per-service docs for what's implemented (`gateway.md`, `auth-service.md`, `sms-service.md`, `ai-service.md`, `worker.md`, `dashboard.md`).
