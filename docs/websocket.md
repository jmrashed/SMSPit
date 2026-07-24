# WebSocket API

Real-time feed of newly captured messages, served by [sms-service](sms-service.md) and proxied unchanged through the [gateway](gateway.md#request-routing).

## Connecting

```
ws://<gateway-host>/ws?token=<key>.<secret>
```

- **Path:** `/ws`, both directly on sms-service and through the gateway (the gateway proxies it as-is, no auth check of its own — see [gateway.md](gateway.md#request-routing)).
- **Auth:** via the `?token=` query parameter, not an `Authorization` header — browsers cannot set custom headers on a WebSocket handshake. The token is the same `{key}.{secret}` value used everywhere else, validated against the same `auth-service` endpoint the REST API uses.
- **On missing or invalid token:** the server closes the connection immediately with close code `4001` and a reason string (`"Missing token"` or `"Invalid or revoked API key"`). There is no retry-with-backoff built into the server side; a client should treat `4001` as "reconnect with a valid token," not "retry the same one."

## Events

Only one event type exists today:

```json
{
  "event": "sms.messages.created",
  "data": {
    "id": "sms_abc123",
    "to": "+8801700000000",
    "from": "SMSPit",
    "message": "Your OTP is 123456",
    "otp": "123456",
    "category": "otp",
    "is_spam": false,
    "status": "captured",
    "replayed_from": null,
    "org_id": null,
    "created_at": "2026-07-24T00:00:00.000Z"
  }
}
```

`data` is the same shape as a `Message` object from the REST API (see the [OpenAPI Reference](openapi/site/index.html#/Messages)) — no separate WebSocket schema to keep in sync.

## Scoping

A connection only receives events for messages belonging to its own organization (or the ungrouped bucket, for a key with no org) — the server tracks each authenticated connection's `org_id` and filters broadcasts against it (`sms-service/src/realtime/realtime.gateway.ts`). A replay (`POST /api/v1/messages/{id}/replay`) fires this same event for the new, replayed message.

## Reconnection

The server does not send a heartbeat/ping or attempt to resume a dropped connection with missed events — a client that disconnects and reconnects gets only new events from that point forward, with no backfill. If you need the messages captured while disconnected, fetch them via `GET /api/v1/messages` after reconnecting.

## Example client (browser)

```js
const ws = new WebSocket(`wss://your-gateway-host/ws?token=${apiKey}`);

ws.onmessage = (event) => {
  const { event: name, data } = JSON.parse(event.data);
  if (name === 'sms.messages.created') {
    console.log('New message captured:', data.id, data.message);
  }
};

ws.onclose = (event) => {
  if (event.code === 4001) {
    console.error('WebSocket auth failed:', event.reason);
    // don't blindly retry with the same token
  }
};
```

## Related documentation

- [sms-service](sms-service.md)
- [Gateway](gateway.md) — passthrough routing
- [Dashboard](dashboard.md) — the reference consumer of this feed
