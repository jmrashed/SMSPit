# sms-service

The core of SMSPit — captures outgoing SMS, exposes the REST API and WebSocket feed, and emulates third-party provider endpoints.

## Stack

| Layer | Technology |
|---|---|
| Language/Framework | TypeScript / NestJS |
| Database | PostgreSQL |
| Real-time | WebSocket |
| Deployment | Docker, Kubernetes |

## Status

Not yet implemented. Core capture/API planned for v0.1, replay/statistics/WebSocket for v0.2, provider emulation/templates/export for v0.3 — see [checklist.md](../checklist.md) Days 11–29, 40–47, 51–55, 61–64.

## Responsibilities

- Capture and persist outgoing SMS messages (never delivers them)
- Serve the native REST API consumed by the dashboard and SDKs
- Emulate provider-compatible endpoints (Vonage, AWS SNS, MessageBird, Infobip, Plivo, Clickatell)
- Push live updates to connected dashboard clients over WebSocket
- Publish capture events to the queue for async AI processing by `worker`

## Planned Features & Functionality

| Feature | Endpoint / Mechanism | Notes |
|---|---|---|
| Capture SMS | `POST /api/v1/messages` | Validates payload, persists, returns captured message |
| List messages | `GET /api/v1/messages` | Paginated, sortable by `created_at` |
| Message detail | `GET /api/v1/messages/{id}` | 404 if not found |
| Delete messages | `DELETE /api/v1/messages` | Guarded bulk delete, audit-logged |
| Search & filter | Query params on list endpoint | Filter by `to`, `from`, date range |
| Replay | `POST /api/v1/messages/{id}/replay` | Re-runs the capture pipeline with the original payload |
| Statistics | `GET /api/v1/statistics` | Aggregated counts by status/day |
| Live updates | WebSocket | Emits an event on every new capture |
| Message templates | CRUD endpoints | Reusable message bodies with variables |
| Export | `GET` export endpoint | Streams CSV/JSON |
| Provider emulation | Adapter endpoints under `src/providers/` | Translates provider-specific payloads to the internal format |

## Directory layout (planned)

```
sms-service/
├── src/
│   ├── messages/
│   ├── websocket/
│   ├── providers/
│   └── main.ts
├── test/
├── Dockerfile
└── package.json
```

## Depends on

- `auth-service` (API key auth, org scoping)
- PostgreSQL, Redis/NATS/Kafka (queue for `worker`)

## Depended on by

- `dashboard`, `gateway`, `worker`
