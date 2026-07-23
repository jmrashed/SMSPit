# OpenAPI reference (Day 94)

[openapi.yaml](openapi.yaml) is a full OpenAPI 3.0 spec for every public HTTP endpoint across the gateway, sms-service, and auth-service: messages (capture/list/get/replay/export/spam-override/delete), templates, statistics, the three provider-compatible adapters, API keys (including rotation), organizations, and teams.

Validated with [Redocly CLI](https://redocly.com/docs/cli/): `npx @redocly/cli lint openapi.yaml` passes with only expected warnings (the `localhost` server URL, and the handful of operations -- health/metrics/list-keys -- that genuinely have no 4xx response).

## Viewing the docs site

[site/index.html](site/index.html) loads the spec into [Swagger UI](https://swagger.io/tools/swagger-ui/) (via CDN, no build step or bundled assets to keep in sync):

```sh
cd docs/openapi && python3 -m http.server 8899
# open http://127.0.0.1:8899/site/index.html
```

Verified rendering correctly with all 8 tag groups (Messages, Templates, Statistics, Provider Adapters, API Keys, Organizations, Teams, System) and no console errors.

## Known intentional divergences

The spec documents two real, deliberate inconsistencies rather than hiding them:

- The MessageBird adapter's request DTO doesn't enforce the same `maxLength` constraints (32/1600) that the native `POST /api/v1/messages` and the other two adapters do -- this is a real gap in `messagebird-send.dto.ts`, not a doc error.
- `GET/DELETE /auth/api-keys*` (including `rotate`) are unauthenticated by design (see [docs/security.md](../security.md#api-key-rotation)) -- modeled with `security: []` rather than silently applying the bearer scheme.
