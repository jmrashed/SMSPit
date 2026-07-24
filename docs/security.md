# Security

Point-in-time review of secrets management, API key lifecycle, and input validation across all services, plus the current identity/header model enforced at the gateway.

## Gateway identity headers

The gateway is the only place API keys are validated against `auth-service` before a request reaches `sms-service` (which also re-validates independently, defense in depth — see [architecture.md#authentication-flow](architecture.md#authentication-flow)). After a successful validation, `gateway/internal/middleware/auth.go`'s `RequireAPIKey` sets four headers on the request, **using `Header.Set` — which unconditionally overwrites any value the client already sent**, so none of these can be spoofed by a caller:

| Header | Set when | Value |
|---|---|---|
| `X-Api-Key-Id` | Always | The validated key's database id |
| `X-Owner-Id` | Always | The key's owner user id |
| `X-Api-Key-Scopes` | Always (may be empty string) | Comma-joined scope list |
| `X-Org-Id` | Only if the key belongs to an organization | The org id |

`sms-service` trusts these headers as-is once a request reaches it through the gateway — it does not re-derive identity from the `Authorization` header for org-scoping purposes, only for its own defense-in-depth key-validity check. **A client must never be allowed to reach `sms-service` directly without going through the gateway's `RequireAPIKey` middleware first**, since that would let it set these headers itself. In the current topology this isn't reachable in normal operation (`sms-service` isn't meant to be exposed publicly), but it's a real trust boundary worth stating explicitly rather than leaving implicit. See [gateway.md#identity-headers](gateway.md#identity-headers) for the full route table this applies to, and [rate-limiting.md](rate-limiting.md) for how `X-Org-Id`/`X-Owner-Id` are used to key the rate limiter.

## Secrets management

All services load configuration exclusively through environment variables (`.env` files locally, `docker-compose.yml`'s `environment:` block in compose, `${VAR}` interpolation for values like `POSTGRES_PASSWORD`/`DASHBOARD_API_KEY`). No secret is hardcoded in source; only `*.env.example` files (with placeholder/empty values) are committed, and every service's `.gitignore` excludes real `.env` files (`auth-service/.gitignore` additionally excludes `.env.backup`/`.env.production`).

There is no vault/secrets-manager integration (HashiCorp Vault, AWS Secrets Manager, SSM) anywhere in the stack — env vars are the only mechanism. **Decision: keep it that way for now.** SMSPit is a self-hosted local-dev/CI sandbox; the operators running it already control the host/containers, so env vars are the right-sized solution. A vault integration would be justified if SMSPit were ever offered as a hosted multi-tenant SaaS product, at which point it becomes its own checklist day rather than something to bolt on speculatively here.

## API key rotation

See [API Key Rotation](api-key-rotation.md) for the user-facing how-to. Implementation summary: added `POST /api-keys/{apiKey}/rotate` to auth-service (`app/Http/Controllers/ApiKeyController.php`). It generates a new key/secret pair with the same `name`/`owner_id`/`org_id`/`scopes` as the source key, revokes the source key (via the same `revoked_at` mechanism `revoke` uses — no hard delete), and returns the new plaintext secret once, matching `store`'s response shape plus a `rotated_from` field. Rotating an already-revoked key still produces a live replacement (rotation is always safe to retry, mirroring `revoke`'s existing idempotency). See `auth-service/tests/Feature/ApiKeyTest.php` for coverage (fresh secret returned, old key revoked and fails validation immediately after, 404 on unknown key, idempotent-safe on an already-revoked key).

### Known finding: unauthenticated key management

**Not fixed by this change:** `POST/DELETE /api-keys*` (including the new `rotate`) are unauthenticated by design, per the existing comment in `docker-compose.yml` — there's no bootstrapping alternative yet (creating the *first* key can't require a key). This means anyone with network access to auth-service can mint, revoke, or rotate any key today. Fixing this needs a real bootstrap-credential design (e.g. an admin-only setup token) and is a bigger change than "add rotation" — flagged here as a known follow-up rather than fixed alongside rotation.

## Input sanitization

sms-service registers a global `ValidationPipe({ whitelist: true, transform: true })` (`src/main.ts`), and `messages`, `templates`, and the MessageBird/Vonage provider adapters all validate incoming payloads through `class-validator`-decorated DTOs.

The one gap found: the AWS SNS-compatible adapter (`src/providers/sns/sns.controller.ts`) reads `req.body` directly rather than through a DTO, because it speaks AWS's form-encoded Query API and returns AWS-shaped XML errors (a DTO + Nest's `ValidationPipe` would emit Nest's own JSON error shape, breaking that contract). It previously checked only for the *presence* of `PhoneNumber`/`Message`, with no type or length constraints. Fixed by hand-validating both fields against the same constraints `CreateMessageDto` already enforces elsewhere (must be a single string, `PhoneNumber` ≤ 32 chars, `Message` ≤ 1600 chars), returning the existing `InvalidParameter` XML error shape on violation. See `src/providers/sns/sns.controller.spec.ts` for the new oversized-field and array-value test cases.

auth-service uses `FormRequest` validation classes consistently for every write endpoint (`StoreApiKeyRequest`, `StoreOrganizationRequest`, `UpdateOrganizationRequest`, `StoreTeamRequest`, `AddTeamMemberRequest`); no controller reads unvalidated raw request input.
