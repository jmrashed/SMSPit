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

Each service owns its own data access and is only reachable through its public API — no service reaches into another's database or internals directly. Shared contracts (where needed) live in [`proto/`](../proto/).

## Cross-cutting concerns (v1.0)

- **Observability:** OpenTelemetry tracing across all services, Prometheus metrics, Grafana dashboards.
- **Multi-tenancy:** All data is scoped by organization; enforced at the query layer in auth-service and sms-service.
- **Deployment:** Docker Compose for local/dev; Kubernetes + Helm for production.

See the [root README](../README.md#roadmap) for the phased rollout of these components, and per-service docs for what's implemented (`gateway.md`, `auth-service.md`, `sms-service.md`, `ai-service.md`, `worker.md`, `dashboard.md`).
