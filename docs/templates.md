# Templates

Reusable message bodies with `{{variable}}` placeholders, scoped like messages and API keys (org-scoped, or ungrouped).

## Endpoints

```
POST   /api/v1/templates
GET    /api/v1/templates
GET    /api/v1/templates/{id}
PUT    /api/v1/templates/{id}
DELETE /api/v1/templates/{id}
```

All require `Authorization: Bearer <key>.<secret>`. `PUT` (not `PATCH`) is the update verb, and all fields on it are optional — it behaves as a partial update despite the `PUT` name (see the [OpenAPI Reference](openapi/site/index.html#/Templates) for the exact schema).

## Fields

| Field | Type | Constraints |
|---|---|---|
| `name` | string | required on create, max 255 chars |
| `body` | string | required on create, max 1600 chars, `{{variable}}` placeholder syntax |
| `variables` | string[] | optional — declares which placeholders `body` uses, so a UI can render one input per variable without parsing the body itself |

## Validation

- `name`/`body` cannot be empty when creating.
- `variables` declaring a name not actually present in `body` (or vice versa) is **not** validated server-side — it's advisory metadata for a picker UI, not enforced consistency. Keep them in sync yourself.

## Rendering

SMSPit does not render `{{variable}}` substitution server-side — there is no "send from template" endpoint. Rendering (filling in `{{otp}}`, `{{name}}`, etc.) happens client-side: the [dashboard](dashboard.md)'s template picker fills the variables into the body text, and the result is sent through the normal `POST /api/v1/messages` capture endpoint like any other message. If you're integrating against the API directly, do the same: fetch/list a template, substitute its `variables` yourself, then call the capture endpoint with the resulting string.

## Example

```sh
curl -X POST http://localhost:8080/api/v1/templates \
  -H "Authorization: Bearer $SMSPIT_API_KEY" -H "Content-Type: application/json" \
  -d '{"name": "OTP", "body": "Your OTP is {{code}}", "variables": ["code"]}'
```

```sh
curl -X PUT http://localhost:8080/api/v1/templates/1 \
  -H "Authorization: Bearer $SMSPIT_API_KEY" -H "Content-Type: application/json" \
  -d '{"name": "OTP v2"}'
```

## Related documentation

- [sms-service](sms-service.md)
- [Dashboard](dashboard.md) — template picker UI
- [OpenAPI Reference](openapi/site/index.html#/Templates)
