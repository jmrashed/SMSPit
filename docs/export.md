# Export

Stream captured messages out of SMSPit as CSV or JSON.

## Endpoint

```
GET /api/v1/messages/export
```

Requires the same `Authorization: Bearer <key>.<secret>` as every other `/api/v1/*` route.

## Query parameters

| Param | Values | Default |
|---|---|---|
| `format` | `csv` \| `json` | `json` |
| `to` | exact-match filter | — |
| `from` | exact-match filter | — |
| `created_after` | ISO 8601 datetime | — |
| `created_before` | ISO 8601 datetime | — |

Note: export's filters are a subset of [list/search](sms-service.md#api)'s — there is no `category`/`is_spam` filter on export today, only on `GET /api/v1/messages`.

## Response

Streamed (not buffered into memory first — safe for large exports), with:

```
Content-Disposition: attachment; filename="messages-export.csv"   # or .json
```

**CSV** columns: `id, to, from, message, status, replayed_from, created_at` (header row included).

**JSON** is a top-level array of the same fields.

## CORS note

The `Content-Disposition` header is not readable by cross-origin JavaScript by default (only "simple" response headers are). The gateway's CORS config explicitly exposes it (`Access-Control-Expose-Headers: Content-Disposition`) — without that, the dashboard's export button would still download the file, just without SMSPit's suggested filename. If you're building your own frontend against the gateway directly, you need the same `Access-Control-Expose-Headers` setup to read the filename client-side.

## Example

```sh
curl "http://localhost:8080/api/v1/messages/export?format=csv&to=%2B8801700000000" \
  -H "Authorization: Bearer $SMSPIT_API_KEY" \
  -o messages.csv
```

## Related documentation

- [sms-service](sms-service.md)
- [OpenAPI Reference](openapi/site/index.html#/Messages)
