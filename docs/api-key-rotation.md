# API Key Rotation

Replace a key's secret without changing its identity (name, owner, organization, scopes), so a leaked or aging credential can be retired without breaking anything that depends on the key existing.

## Why rotate instead of just revoking

Revoking a key (`DELETE /auth/api-keys/{apiKey}`) removes it with nothing to replace it — every integration using it breaks immediately. Rotation instead:

1. Generates a brand-new key/secret pair with the same `name`, `owner_id`, `org_id`, and `scopes` as the source key.
2. Revokes the source key (same `revoked_at` mechanism as a normal revoke — no hard delete, so it's still auditable).
3. Returns the new plaintext secret once, exactly like creating a key for the first time.

You still have to update whatever was using the old key with the new one — rotation doesn't do that for you — but it gives you a clean, auditable handoff point rather than a hard cutover.

## API

```
POST /auth/api-keys/{apiKey}/rotate
```

No body. No auth required (see [security.md](security.md#known-finding-unauthenticated-key-management) for why key-management routes are unauthenticated by design in the current version).

**Response** (`201`):

```json
{
  "id": 32,
  "name": "qa-rotate-test",
  "key": "sms_live_0d4cb800a41c1b1d.647b03fc1ccd7310c0a88fd822401464c819c09453186ae0",
  "org_id": null,
  "scopes": [],
  "rotated_from": 31,
  "created_at": "2026-07-24T21:47:44+00:00"
}
```

Same shape as creating a key, plus `rotated_from` (the id of the now-revoked source key). `key` is the full `{lookup}.{secret}` value — shown once, exactly as on creation.

## What happens to the old key

Revoked immediately (`revoked_at` set) — any request using it fails validation right away, the same as an explicit revoke. Rotating an **already-revoked** key is safe and idempotent: it still produces a fresh, live replacement rather than erroring, so rotation is always safe to retry.

## Security considerations

- The new secret is only ever shown in this one response — store it immediately, the same as any newly created key.
- Rotation doesn't require proving you control the old key (no auth on this route currently) — anyone with network access to `auth-service` can rotate any key. This is the same known, accepted gap as key creation/revocation/listing; see [security.md](security.md#known-finding-unauthenticated-key-management).

## Dashboard workflow

The [dashboard](dashboard.md)'s API keys page lists keys with a rotate action alongside revoke; rotating shows the new plaintext secret once in a copy-to-clipboard dialog, matching the create flow.

## Related documentation

- [Security](security.md) — full API key lifecycle and the unauthenticated-management known finding
- [auth-service](auth-service.md)
