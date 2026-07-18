# REST ↔ proto field mapping — `sms.v1.Message`

Source of truth for wire-format fields is [`proto/sms/v1/message.proto`](../../proto/sms/v1/message.proto). The REST API (`sms-service`) is a JSON projection of the same contract. This doc tracks where the two diverge so REST and proto don't drift apart as fields are added.

Scope: v0.1 only (capture, list, details, delete, search). Replay and statistics endpoints are v0.2 and are not yet part of this contract.

## `Message`

| proto field (`Message`) | type | REST JSON field | notes |
|---|---|---|---|
| `id` | `string` | `id` | e.g. `sms_123456` |
| `to` | `string` | `to` | E.164 phone number |
| `from` | `string` | `from` | sender ID / name |
| `body` | `string` | `message` | **name differs**: proto uses `body` to match the `messages.body` DB column (checklist Day 5); REST keeps `message` to match the README's documented request/response shape |
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

`sms-service` is REST-only in v0.1; the proto contract exists as the shared schema definition (and future gRPC option), not as a currently-served gRPC API.
