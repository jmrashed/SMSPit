# End-to-end QA pass (Day 98)

Full stack (`gateway`, `auth-service`, `sms-service`, `dashboard`) started via `scripts/dev-up.sh` with real Postgres/Redis; `ai-service`/`worker` not running (out of scope for this pass, and sms-service is designed to degrade gracefully when they're absent — confirmed below).

## Features manually verified against the running system

| Feature | Result |
|---|---|
| Capture (`POST /api/v1/messages`) | Pass |
| Get by id, list/search/filter, paginate | Pass |
| Replay | Pass |
| Manual spam override | Pass |
| Statistics aggregation | Pass |
| Templates (create/list/update/delete) | Pass |
| Export (CSV and JSON) | Pass |
| MessageBird / Vonage / SNS provider adapters | **Failed through the gateway, fixed (see below)** |
| API key create / rotate / revoke | Pass |
| Organizations (create/list) and Teams (create) | Pass |
| Per-org rate limiting (normal load) | Pass (no false-positive 429s) |
| WebSocket real-time broadcast | Pass (confirmed a captured message pushed to a live WS client) |
| Dashboard: inbox, filters, org switcher | Pass (Playwright, no console errors) |
| Dashboard: message detail + replay button | Pass |
| Dashboard: statistics page + chart | Pass |
| Dashboard: API keys page (reflecting rotate/revoke from this pass) | Pass |
| Dashboard: organizations page (reflecting org/team created in this pass) | Pass |

## Bug found and fixed

**The three provider-compatible adapters (`/providers/messagebird/messages`, `/providers/vonage/sms/json`, `/providers/sns`) 404'd through the gateway**, despite working correctly when called directly against sms-service. The gateway (`gateway/internal/router/router.go`) had routes for `/api/v1/*`, `/auth/*`, and `/ws`, but never registered `/providers/*` at all -- an entire v0.3 feature (Days 51-55) was unreachable through the gateway, the intended public entry point for the whole stack.

Root cause: the route was simply never added when the gateway was scaffolded (Day 37-39), since the provider adapters didn't exist yet at that point, and no later day revisited the gateway's route list when they were added.

Fix: added `r.Handle("/providers/*", proxy.New(cfg.SMSServiceURL, "", ""))`, left unguarded (no `RequireAPIKey`) to match sms-service's own adapters, which intentionally accept no SMSPit auth so an existing provider SDK can point at SMSPit by swapping its base URL alone. Verified live against the running gateway for all three adapters, and added `TestRoutesToProviderAdaptersWithoutRequiringAnAPIKey` to `gateway/internal/router/router_test.go` as a regression test.

## Automated test suites re-run after the fix

| Suite | Result |
|---|---|
| gateway (`go test ./...`) | Pass (includes the new regression test) |
| worker (`go test ./...`) | Pass |
| ai-service (`pytest`) | 48 passed |
| auth-service (`php artisan test`) | 42 passed |
| sms-service (`npm run test:cov` + `test:e2e`) | 111 passed, 3 pre-existing skips (unrelated to this pass) |
| dashboard (`npm run lint` + `build`) | Pass (2 pre-existing lint warnings, no errors) |
| PHP / Go / Node.js / Python SDKs | 5/5/5/5 passed |
