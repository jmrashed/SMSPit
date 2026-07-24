# REST ↔ proto field mapping — `sms.v1.Message`

Source of truth for wire-format fields is [`proto/sms/v1/message.proto`](https://github.com/jmrashed/SMSPit/blob/main/proto/sms/v1/message.proto). The REST API (`sms-service`) started as a JSON projection of that contract.

**This mapping is intentionally frozen at v0.1 scope** (capture, list, details, delete, search) — the `.proto` file was never extended as sms-service grew through v0.2–v1.0 (replay, statistics, templates, export, `otp`/`category`/`is_spam`/`org_id`/`replayed_from` fields). Proto remains the shared schema definition for the original core fields and a possible future gRPC option; it is not a currently-served gRPC API, and it does not describe SMSPit's full current REST contract.

**For the complete, current REST API** — every endpoint, field, and status code added since v0.1 — see the [OpenAPI Reference](../openapi/site/index.html) instead. This page only remains useful for the specific fields it covers below.

## `Message`

| proto field (`Message`) | type | REST JSON field | notes |
|---|---|---|---|
| `id` | `string` | `id` | e.g. `sms_123456` |
| `to` | `string` | `to` | E.164 phone number |
| `from` | `string` | `from` | sender ID / name |
| `body` | `string` | `message` | **name differs**: proto uses `body` to match the `messages.body` DB column; REST keeps `message` to match the README's documented request/response shape |
| `status` | `MessageStatus` enum | `status` | REST serializes the enum as lowercase string, e.g. `MESSAGE_STATUS_CAPTURED` → `"captured"` |
| `created_at` | `int64` (Unix epoch seconds) | `created_at` | REST serializes as ISO 8601 string |

## Endpoint → RPC message mapping

| REST endpoint | proto request/response |
|---|---|
| `POST /api/v1/messages` | `SendMessageRequest` / `SendMessageResponse` |
| `GET /api/v1/messages` | `ListMessagesRequest` / `ListMessagesResponse` |
| `GET /api/v1/messages/{id}` | `GetMessageRequest` → `Message` |
| `DELETE /api/v1/messages` | `DeleteMessagesRequest` / `DeleteMessagesResponse` |

## List pagination (`?limit=&offset=`)

`GET /api/v1/messages` takes `limit` (default 20, max 100) and `offset` (default 0) query params, matching `ListMessagesRequest.limit`/`.offset`. The response envelope is `{ messages, total, limit, offset }` — `total` is the full matching-row count, not just the current page's size, so clients can compute whether more pages exist.

## List filtering (`?to=&from=&created_after=&created_before=`)

`GET /api/v1/messages` also takes optional filters, matching `ListMessagesRequest`'s `to`/`from`/`created_after`/`created_before`:

- `to`, `from`: exact match against the message's `to`/`from` columns.
- `created_after`, `created_before`: ISO 8601 datetime strings (REST) vs. Unix epoch seconds (proto's `int64`), inclusive on both ends. Either can be supplied alone (open-ended range) or together (bounded range).

All filters combine with AND when supplied together.

`sms-service` is REST-only in v0.1; the proto contract exists as the shared schema definition (and future gRPC option), not as a currently-served gRPC API.
