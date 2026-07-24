# sms-service

**Status: Implemented.** The core of SMSPit — captures outgoing SMS, exposes the native REST API and WebSocket feed, and emulates third-party provider endpoints.

## Stack

| Layer | Technology |
|---|---|
| Language/Framework | TypeScript / NestJS |
| Database | PostgreSQL (schema owned by [auth-service](auth-service.md), see [Architecture: Database migrations](architecture.md#database-migrations)) |
| Real-time | WebSocket (see [WebSocket API](websocket.md)) |
| Deployment | Docker, Kubernetes (see [Kubernetes](kubernetes.md) / [Helm](helm.md)) |

## Responsibilities

- Capture and persist outgoing SMS messages (never delivers them)
- Serve the native REST API consumed by the dashboard and [SDKs](sdks.md)
- Emulate provider-compatible endpoints (Vonage, AWS SNS, MessageBird — see [Provider Compatibility](api/provider-compatibility.md))
- Push live updates to connected dashboard clients over WebSocket
- Call `ai-service` synchronously on capture for OTP/classification/spam enrichment (never blocks a capture if `ai-service` is down)
- Publish capture events to Redis Streams for `worker`'s async processing (see [Redis and Queues](redis.md))

## API

| Feature | Endpoint(s) | Notes |
|---|---|---|
| Capture | `POST /api/v1/messages` | Validates, persists, enriches (OTP/category/spam), returns the captured message |
| List / search | `GET /api/v1/messages` | Paginated (`limit`/`offset`), filterable by `to`/`from`/`category`/`is_spam`/date range |
| Detail | `GET /api/v1/messages/{id}` | 404 if not found (org-scoped) |
| Manual spam override | `PATCH /api/v1/messages/{id}/spam` | Corrects a false AI spam verdict |
| Replay | `POST /api/v1/messages/{id}/replay` | Re-captures the original payload as a new, linked message |
| Delete | `DELETE /api/v1/messages` | Guarded bulk delete (`confirm: true` required to wipe an org's whole inbox) |
| Statistics | `GET /api/v1/statistics` | Aggregate counts by status/day |
| Export | `GET /api/v1/messages/export` | Streamed CSV/JSON — see [Export](export.md) |
| Templates | `GET/POST/PUT/DELETE /api/v1/templates[/{id}]` | `{{variable}}` placeholders — see [Templates](templates.md) |
| Live updates | `GET /ws` | WebSocket — see [WebSocket API](websocket.md) |
| Provider emulation | `POST /providers/{messagebird,vonage,sns}/...` | See [Provider Compatibility](api/provider-compatibility.md) |

Full request/response schemas and every status code: [OpenAPI Reference](openapi/site/index.html). Field-level REST↔proto mapping for the original v0.1 contract: [Message Mapping](api/message-mapping.md).

## Configuration

| Env var | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `REDIS_HOST`, `REDIS_PORT` | Queue publish target for `worker` (degrades to no-op if unreachable) |
| `AUTH_SERVICE_URL` | Key validation (defense-in-depth alongside the gateway's own check) |
| `AI_SERVICE_URL` | OTP/classification/spam enrichment; unset or unreachable degrades to "not detected," never fails a capture |
| `CORS_ORIGIN` | Allowed browser origin |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint, see [Observability](observability.md) |

See [.env.example](https://github.com/jmrashed/SMSPit/blob/main/sms-service/.env.example) for the full list.

## Directory layout

```
sms-service/
├── src/
│   ├── messages/       # capture, list, replay, spam override, export
│   ├── templates/
│   ├── statistics/
│   ├── realtime/        # WebSocket gateway
│   ├── providers/       # messagebird/, vonage/, sns/ adapters
│   ├── auth/             # ApiKeyGuard, auth-service client
│   ├── ai/                # ai-service client
│   ├── queue/             # Redis Streams publisher
│   ├── metrics/           # Prometheus
│   └── main.ts
├── test/                  # e2e specs
├── Dockerfile
└── package.json
```

## Testing

```sh
cd sms-service
npm ci
npm run build
npm run test:cov   # unit + coverage gate (90%/80%/90%/90%)
npm run test:e2e   # needs auth-service's schema migrated into the same Postgres
```

See [Testing](testing.md) for the full-repo picture, required services (Postgres), and how CI runs this.

## Related documentation

- [Architecture Overview](architecture.md)
- [Security](security.md) — auth guard, input validation
- [Multi-tenancy](multi-tenancy.md) — org scoping on messages/templates/statistics
- [Rate Limiting](rate-limiting.md) — enforced upstream at the gateway, not here
- [Redis and Queues](redis.md) — capture → Streams → worker
- [Observability](observability.md)
- [SDKs](sdks.md)

## Depends on

- [auth-service](auth-service.md) (API key auth, org scoping)
- PostgreSQL, Redis

## Depended on by

- [dashboard](dashboard.md), [gateway](gateway.md), [worker](worker.md) (via the queue, not directly)
