# Rate Limiting

Per-tenant request throttling, enforced only at the [gateway](gateway.md), only on `/api/v1/*`.

## What's protected

| Route | Rate limited? |
|---|---|
| `/api/v1/*` | **Yes** |
| `/providers/*` | No — these mimic real providers' own unauthenticated formats; there's no resolved tenant identity to key on |
| `/auth/*` | No — enforced (if at all) independently within auth-service |
| `/ws` | No |
| `/healthz`, `/metrics` | No |

Calling `sms-service` or `auth-service` directly (bypassing the gateway) also bypasses the limiter entirely — it's gateway-only middleware, not enforced downstream.

## Defaults and configuration

| Setting | Default | Configured via |
|---|---|---|
| Requests per window | 300 | `RATE_LIMIT_PER_MINUTE` env var on the gateway |
| Window | 1 minute, fixed (not sliding) | not configurable |

## Keying (identity)

The limiter keys on the **organization**, falling back to the **key owner** for keys with no organization:

1. `X-Org-Id` header, if the validated API key belongs to an organization
2. Otherwise `X-Owner-Id` (the key's owner user id)

Both headers are set by the gateway's own auth middleware immediately before the rate limiter runs, from the already-validated key — see [gateway.md#identity-headers](gateway.md#identity-headers). This means every API key belonging to the same organization shares one quota; two different keys in the same org do not get separate 300/min allowances.

## Response on exceeding the limit

```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds until the window resets>
Content-Type: application/json

{"code":"RATE_LIMITED","message":"Too many requests for this organization","details":null}
```

Same `{code, message, details}` envelope as every other SMSPit error response.

## Implementation notes

- In-memory, fixed-window counter per gateway process — no external dependency (Redis, etc.). See [gateway/internal/middleware/ratelimit.go](https://github.com/jmrashed/SMSPit/blob/main/gateway/internal/middleware/ratelimit.go).
- **Per gateway instance, not cluster-wide.** Running N gateway replicas behind a load balancer multiplies the effective per-org quota by N, since each instance tracks its own counts independently. Fine at small N; if you scale the gateway significantly, this needs to move to a shared store (Redis) to enforce a true global cap — see [Production Deployment: scaling notes](production-deployment.md#scaling-notes-kubernetes).

## Adjusting limits

Set `RATE_LIMIT_PER_MINUTE` in the gateway's environment (Compose: `docker-compose.yml`'s `gateway.environment`; Kubernetes/Helm: the gateway's ConfigMap/values, see [Helm](helm.md#parameterized-values)).

## Related documentation

- [Gateway](gateway.md) — where this is enforced
- [Multi-tenancy](multi-tenancy.md) — the org-scoping this keys on
- [Production Deployment](production-deployment.md) — scaling caveats
