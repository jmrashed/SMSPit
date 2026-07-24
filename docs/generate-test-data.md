# Generate Test Data

Synthesize sample SMS messages for exercising the dashboard/API without a real integration, via [ai-service](ai-service.md).

## What it does

`ai-service` produces `count` synthetic messages (`to`, `from`, `message`, `type`), optionally all of one `type` (`otp` / `transactional` / `marketing` / `other`) or a random mix if `type` is omitted. The [dashboard](dashboard.md) then captures each generated message through the normal `POST /api/v1/messages` endpoint — the same capture path a real integration would use — so generated messages go through the same OTP/classification/spam enrichment as anything else, and appear in the inbox live over [WebSocket](websocket.md) exactly like a real capture would.

## Where it's available

- **Dashboard**: a "Generate test data" button on the inbox.
- **API directly**: `POST /generate-test-data` on `ai-service` (not proxied by the gateway — call `ai-service` directly, or replicate the dashboard's two-step flow: generate, then capture each result yourself via `POST /api/v1/messages`).

## Request/response (ai-service)

```
POST /generate-test-data
{"count": 5, "type": "otp"}
```

```json
{
  "messages": [
    {"to": "+15551234567", "from": "SMSPit", "message": "Your OTP is 481923", "type": "otp"}
  ]
}
```

`count`: 1-50 (`ai-service`'s own limit). `type`: omit for a random mix.

## Dashboard limits

The dashboard caps `count` at **20** (well below `ai-service`'s own 50) and requires an explicit confirmation dialog for any count over **5** — since this writes real rows via the same capture endpoint a live integration uses, a fat-fingered count shouldn't be able to flood the inbox unnoticed.

## Is it safe for production?

It's a development/testing convenience, not something to expose to untrusted users: `ai-service`'s `/generate-test-data` endpoint has no SMSPit API key requirement of its own (like the rest of `ai-service`), and generated messages are captured as normal, org-scoped data indistinguishable from a real message once created. Don't wire the dashboard's generate button (or the underlying endpoint) into a production instance's public-facing surface.

## Related documentation

- [ai-service](ai-service.md)
- [Dashboard](dashboard.md)
