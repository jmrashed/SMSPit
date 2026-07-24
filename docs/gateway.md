# gateway

**Status: Implemented.** API Gateway — the single entry point for all SMSPit traffic. Routes requests to backend services and enforces authentication and rate limiting at the edge.

## Stack

| Layer | Technology |
|---|---|
| Language | Go |
| Routing | [chi](https://github.com/go-chi/chi) |
| Deployment | Docker, Kubernetes (see [Kubernetes](kubernetes.md) / [Helm](helm.md)) |

## Responsibilities

- Reverse-proxy incoming requests to `auth-service` and `sms-service`
- Validate API key authentication before proxying to `sms-service` (delegates the actual check to `auth-service`)
- Enforce per-tenant rate limiting on `/api/v1/*` (see [Rate Limiting](rate-limiting.md))
- Path-based routing (`/api/v1/*` → sms-service, `/providers/*` → sms-service, `/auth/*` → auth-service, `/ws` → sms-service)
- WebSocket passthrough for real-time dashboard updates (see [WebSocket API](websocket.md))
- Health check (`/healthz`) and Prometheus metrics (`/metrics`) endpoints

**Not** proxied by the gateway: `ai-service` has no gateway route. It's called directly and only by `sms-service` (synchronously, on capture) and `worker` (asynchronously, off the queue) — see [ai-service](ai-service.md).

## Request routing

| Route | Forwards to | Auth required | Rate limited |
|---|---|---|---|
| `GET /healthz` | (handled by the gateway itself) | No | No |
| `GET /metrics` | (handled by the gateway itself) | No | No |
| `/api/v1/*` | `sms-service`, path unchanged | Yes (`Authorization: Bearer <key>.<secret>`) | Yes, per org/owner |
| `/providers/*` | `sms-service`, path unchanged | No — mimics real providers' own (unauthenticated-by-SMSPit) wire formats, see [Provider Compatibility](api/provider-compatibility.md) | No |
| `/auth/*` | `auth-service`, prefix rewritten `/auth` → `/api` | Depends on the specific `auth-service` route (see [security.md](security.md)) | No |
| `/ws` | `sms-service`, path unchanged | Via `?token=` query param at the sms-service layer (browsers can't set custom headers on a WS handshake) | No |

## Identity headers

After `RequireAPIKey` validates a request against `auth-service`, it sets these headers on the request before forwarding to `sms-service` — **unconditionally overwriting** any value a client may have sent, so they cannot be spoofed:

| Header | Always set? | Source |
|---|---|---|
| `X-Api-Key-Id` | Yes | The validated API key's database id |
| `X-Owner-Id` | Yes | The key's owner user id |
| `X-Api-Key-Scopes` | Yes (may be empty) | Comma-joined scope list |
| `X-Org-Id` | Only if the key belongs to an organization | The org id; absent for ungrouped keys |

The per-tenant rate limiter keys on `X-Org-Id` when present, falling back to `X-Owner-Id` for keys with no organization. Full detail: [Rate Limiting](rate-limiting.md).

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `GATEWAY_PORT` | `8080` | Listen port |
| `SMS_SERVICE_URL` | `http://localhost:3000` | Upstream for `/api/v1/*`, `/providers/*`, `/ws` |
| `AUTH_SERVICE_URL` | `http://localhost:8000` | Upstream for `/auth/*` and the internal key-validation call |
| `CORS_ORIGIN` | `*` | Allowed browser origin |
| `RATE_LIMIT_PER_MINUTE` | `300` | Per-tenant request quota, see [Rate Limiting](rate-limiting.md) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset (tracing disabled) | OTLP collector endpoint, see [Observability](observability.md) |

## Directory layout

```
gateway/
├── cmd/gateway/main.go
├── internal/
│   ├── router/       # route table (router.go)
│   ├── middleware/    # RequireAPIKey, PerTenantRateLimiter
│   ├── auth/          # auth-service validation client
│   └── proxy/         # reverse proxy construction
├── config/
├── Dockerfile
└── go.mod
```

## Testing

```sh
cd gateway
go vet ./...
go test ./...
```

See [Testing](testing.md) for how this fits into the full-repo test run and CI.

## Related documentation

- [Architecture Overview](architecture.md)
- [Security](security.md) — auth model, unauthenticated routes, API key lifecycle
- [Multi-tenancy](multi-tenancy.md) — org scoping enforced downstream of these headers
- [Rate Limiting](rate-limiting.md)
- [Observability](observability.md) — tracing/metrics on this service
- [OpenAPI Reference](openapi/site/index.html)
