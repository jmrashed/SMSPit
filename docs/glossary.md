# Glossary

**Capture** — SMSPit's core action: receiving an outgoing SMS request and persisting it (with enrichment) instead of delivering it. See [FAQ](faq.md#what-is-the-difference-between-capture-and-delivery).

**Delivery** — What a real SMS provider does (hands a message to a mobile carrier). SMSPit never does this.

**Replay** — Re-running a previously captured message's original payload through the capture pipeline again, producing a new message linked to the original via `replayed_from`. See [Architecture: Message lifecycle](architecture.md#message-lifecycle).

**Provider Adapter** — An endpoint that accepts a specific real SMS provider's own request format (e.g. MessageBird's, Vonage's) and translates it into SMSPit's internal capture call. See [Provider Compatibility](api/provider-compatibility.md).

**Provider Emulation** — The overall capability of provider adapters: letting an app that already integrates with a real provider's SDK point that SDK at SMSPit unmodified, by swapping only the base URL.

**Organization** — The top-level multi-tenancy boundary. Every API key belongs to exactly one organization or none. See [Organizations and Teams](organizations-and-teams.md).

**Team** — A grouping of users within an organization (e.g. "Engineering"). Carries no data-scoping role of its own — scoping happens at the organization level.

**Org-scoped** — Data (a message, template, or key) that belongs to a specific organization and is only visible to keys belonging to that same organization.

**Ungrouped** — An API key, message, or template with no organization (`org_id: null`). Ungrouped data is its own isolated bucket, visible only to other ungrouped keys — not a wildcard visible to everyone.

**API Key** — The credential used to authenticate against SMSPit's REST API, in the form `{lookup}.{secret}` (e.g. `sms_live_abc123.def456...`). The `{lookup}` half is a non-secret identifier; only the `{secret}` half must be kept safe.

**API Key Rotation** — Replacing a key's secret (generating a new key/secret pair with the same identity) while revoking the original, without needing a manual create-then-delete sequence. See [API Key Rotation](api-key-rotation.md).

**Template** — A reusable message body containing `{{variable}}` placeholders, filled in by the caller (dashboard or API client) before capture — SMSPit does not render templates server-side. See [Templates](templates.md).

**Template Variable** — A named placeholder (`{{name}}`) inside a template's `body`, declared in the template's `variables` list for UI purposes.

**Message** — A single captured SMS: `to`, `from`, `message` (body), plus AI-derived `otp`/`category`/`is_spam` fields, `status`, and org scoping.

**WebSocket Event** — A real-time push notification sent to connected dashboard/API clients when a message is captured (`sms.messages.created`). See [WebSocket API](websocket.md).

**Worker** — The Go service that asynchronously consumes capture events off the Redis Streams queue and classifies them via `ai-service` — but does not currently write results back to the message record. See [worker.md](worker.md#current-behavior).

**Queue** — The Redis Streams-backed `sms.messages.created` stream that `sms-service` publishes to and `worker` consumes from. See [Redis and Queues](redis.md).

**AI Classification** — Rule-based/regex categorization of a message into `otp` / `transactional` / `marketing` / `other`, performed by [ai-service](ai-service.md).

**Rate Limiting** — Per-organization request throttling enforced at the gateway on `/api/v1/*`. See [Rate Limiting](rate-limiting.md).

**Gateway** — The single public entry point for all SMSPit traffic; reverse-proxies to `auth-service` and `sms-service`, enforces authentication and rate limiting. See [gateway.md](gateway.md).
