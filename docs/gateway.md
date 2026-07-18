# gateway

API Gateway — the single entry point for all SMSPit traffic. Routes requests to backend services and enforces authentication at the edge.

## Stack

| Layer | Technology |
|---|---|
| Language | Go |
| Routing | HTTP router (chi/gin/echo — TBD at implementation) |
| Deployment | Docker, Kubernetes |

## Status

Not yet implemented. Planned for v0.2 (see [checklist.md](../checklist.md) Days 37–39, 48–49).

## Responsibilities

- Reverse-proxy incoming requests to `auth-service`, `sms-service`, and `ai-service`
- Terminate and validate API key authentication before proxying (delegates validation to `auth-service`)
- Path-based routing (e.g. `/api/v1/messages` → sms-service, `/api-keys` → auth-service)
- WebSocket passthrough for real-time dashboard updates
- Health check endpoint for orchestration/monitoring

## Planned Features & Functionality

| Feature | Description |
|---|---|
| Request routing | Maps incoming paths to the correct backend service |
| Auth enforcement | Rejects unauthenticated/invalid requests before they reach backend services |
| Rate limiting | Per-organization request throttling (v1.0) |
| Tracing | Injects/propagates OpenTelemetry trace context (v1.0) |
| Provider adapter routing | Routes provider-compatible endpoints (Twilio-style paths, etc.) to sms-service's adapter layer (v0.3) |

## Directory layout (planned)

```
gateway/
├── cmd/gateway/main.go
├── internal/
│   ├── router/
│   ├── middleware/
│   └── proxy/
├── config/
├── Dockerfile
└── go.mod
```

## Depends on

- `auth-service` (API key validation)
- `sms-service`, `ai-service` (proxied routes)
