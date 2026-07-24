> Mirrored from [`CHANGELOG.md`](https://github.com/jmrashed/SMSPit/blob/main/CHANGELOG.md) in the main repo — relative links/paths below refer to that location, not this docs site.

# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.2] - 2026-07-24

The first release whose CI actually runs fully green end-to-end. After tagging v1.0.1, CI was still broken on that exact commit — gaps that had never surfaced before because the jobs that would have caught them (auth-service's own test suite, the worker job, sms-service's coverage gate) either didn't exist in CI or were never actually enforced until Day 95 turned them on for real.

### Fixed

- `auth-service` and `worker` CI jobs had no Redis service container. `auth-service`'s Prometheus metrics (Day 84) use a Redis-backed storage adapter, and `worker`'s consumer tests create a real Redis Streams consumer group — both need Redis just to run their test suites, not just at runtime.
- `sms-service`'s coverage thresholds (90%/80%/90%/90%) were failing at 87.8%/78%/86.8%/87.6% because `metrics.controller.ts` and `metrics.middleware.ts` (Day 84) had no tests at all. Added both; coverage is now 91.76%/80.53%/93.4%/91.6%.

## [1.0.1] - 2026-07-24

Fixes CI's `lint` job, which was failing on the exact commit `v1.0.0` was tagged from — a pre-existing gap from Days 88/89 that was only caught after tagging: Locust wrote some `scripts/load-test/results/*.csv` files with CRLF line endings, and `sdks/php/phpunit.xml` used non-multiple-of-2 indentation, both violating `.editorconfig`. Since `lint` gates every other CI job (including `publish-images`), `v1.0.0`'s tag push never actually published Docker images to GHCR. `v1.0.0` itself is left as-is (already tagged and released); this patch release is the one whose CI actually runs green end-to-end. No functional code changes.

### Fixed

- CRLF line endings in `scripts/load-test/results/*.csv`, converted to LF
- Non-2-space indentation in `sdks/php/phpunit.xml`, reformatted

## [1.0.0] - 2026-07-24

The v1.0 milestone (checklist Days 81–100): Kubernetes/Helm, full observability, hardened multi-tenancy, native SDKs, a complete OpenAPI reference, an extended CI/CD pipeline, a production deployment guide, and an end-to-end QA pass. No new services — this release hardens and completes the six services shipped through v0.4, rather than adding a seventh.

### The v0.1 → v1.0 journey, briefly

- **v0.1** — the core loop: capture, list/search, replay, a dashboard, Docker. `sms-service` (NestJS) and `dashboard` (React) only.
- **v0.2** — `auth-service` (Laravel) and `gateway` (Go) join; API-key authentication enforced end to end, statistics, WebSocket live updates.
- **v0.3** — provider-compatible endpoints (Vonage/SNS/MessageBird), multi-tenancy (organizations/teams), message templates, export. No new services.
- **v0.4** — `ai-service` (FastAPI) and `worker` (Go) join; OTP detection, classification, spam detection, synthetic test-data generation.
- **v1.0** — no new services; hardens and completes the six above for production use (this entry).

### Added

- **Multi-tenancy hardening (Day 86)**: audited every org-scoped query/endpoint across `sms-service` and `auth-service` — no gaps found, existing scoping already correct. Added the one real gap: per-org rate limiting at the gateway (`gateway/internal/middleware/ratelimit.go`), an in-memory fixed-window limiter keyed on org id (falling back to owner id), default 300 req/min, configurable via `RATE_LIMIT_PER_MINUTE`.
- **Security review (Day 87)**: `POST /api-keys/{apiKey}/rotate` in `auth-service` (generates a fresh key/secret, revokes the source key); closed an input-validation gap in the SNS provider adapter (unbounded field lengths/types); documented the env-vars-only secrets management decision (see [docs/security.md](docs/security.md)).
- **Load testing (Day 88)**: Locust scripts (`scripts/load-test/`) against the gateway found every request serializing to a ~14s median latency floor regardless of load — traced to `scripts/dev-up.sh` starting `auth-service` via `php artisan serve`, single-threaded by default, throttling the whole stack since both the gateway and `sms-service` validate every request against it. Fixed by properly enabling `PHP_CLI_SERVER_WORKERS` (Laravel's `ServeCommand` silently ignores it without `--no-reload`); latency dropped to ~3.2s median, ~7x throughput in the same environment. See [docs/load-testing.md](docs/load-testing.md).
- **4 native SDKs (Days 89-92)**: PHP (`smspit/sdk`, ext-curl), Go (`github.com/jmrashed/SMSPit/sdks/go`, `net/http`), Node.js (`@smspit/sdk`, global `fetch`), Python (`smspit`, `urllib`) — each with `send`/`list`/`get`/`replay`, no third-party HTTP dependency, and verified live against a running instance, not just mocked tests. Cross-SDK docs at [docs/sdks.md](docs/sdks.md) (Day 93).
- **Full OpenAPI reference + docs site (Day 94)**: [docs/openapi/openapi.yaml](docs/openapi/openapi.yaml) covers every endpoint across the gateway, `sms-service`, and `auth-service`; validated with Redocly CLI. A Swagger UI docs site ([docs/openapi/site/](docs/openapi/site/)) renders it, verified live with Playwright. Documents 2 real inconsistencies found rather than hiding them (the MessageBird adapter's missing length constraints, and the unauthenticated API key management routes).
- **Extended CI/CD (Day 95)**: `.github/workflows/ci.yml` gained test jobs for `gateway`, `worker`, `ai-service`, `dashboard`, and all 4 SDKs (previously only `auth-service`'s migration — never its own tests — and `sms-service` ran); a `publish-images` job (GHCR, matrix over all 6 services) gated on `v*` tags; a `deploy-staging` job running the Day 82 Helm chart behind a `staging` GitHub Environment.
- **Container registry (Day 96)**: GHCR chosen (zero extra secrets — authenticates with the workflow's own `GITHUB_TOKEN`). See [docs/registry.md](docs/registry.md).
- **Production deployment guide (Day 97)**: [docs/production-deployment.md](docs/production-deployment.md) covers Compose and Kubernetes/Helm deployment, an env var reference, and scaling notes. Found and fixed a real bug while writing it: the Helm chart's default `image.repository` values still pointed at unpublished `smspit/*` names instead of the Day 96 GHCR names.
- **End-to-end QA pass (Day 98)**: manually verified every major feature against a live stack. Found and fixed a real bug: the 3 provider-compatible adapters were completely unreachable through the gateway (`/providers/*` was never routed — an entire v0.3 feature, invisible to anyone going through the intended public entry point). See [docs/qa-day98.md](docs/qa-day98.md).
- **Docs refresh for v1.0 (Day 99)**: README's "planned" framing (left over from the v0.1 draft) replaced with accurate status throughout — Features, Quick Start, REST API (including a real `PATCH`→`PUT` template-endpoint documentation bug fix), Roadmap; added [CONTRIBUTING.md](CONTRIBUTING.md).

### Known gaps

- This tag's own CI run did not publish Docker images to GHCR — see [1.0.1] and [1.0.2] below for why, and [1.0.2] for the release whose CI actually reaches that step. The 4 SDKs are not yet published to their package registries (Packagist/pkg.go.dev/npm/PyPI) either — no registry credentials in this environment, see [docs/sdks.md](docs/sdks.md#publishing-status).
- No Docker/Podman/kubectl/helm binary was available in the environment this release was built in — every Docker/Kubernetes-related claim above was verified by an equivalent means (host toolchain builds, live process replication, manifest parsing) rather than a real `docker compose up`/`kubectl apply`/`helm install`. Re-verify the first real deployment against [docs/production-deployment.md](docs/production-deployment.md).

## [0.4.0] - 2026-07-21

AI OTP detection, classification, spam detection, and test-data generation, per the [v0.4 roadmap](README.md#roadmap). Two new services — `ai-service` (FastAPI) and `worker` (Go) — join the four from v0.3, wired into `docker-compose.yml`.

### Added

- **`ai-service` (FastAPI)** — stateless, unauthenticated (local helper, not a data store):
  - `POST /detect-otp` — regex-based OTP extraction, keyword-adjacent match preferred over a bare digit run
  - `POST /classify` — rule-based category (`otp`/`transactional`/`marketing`/`other`), OTP takes priority over other keyword matches
  - `POST /detect-spam` — keyword/heuristic scoring (spam keywords, excessive `!`, URLs, ALL-CAPS words), capped at 1.0, flagged at ≥0.5
  - `POST /generate-test-data` — synthetic SMS samples (`count` 1–50, optional `type`), for exercising the dashboard/API without a real integration
  - 100% statement coverage (`pytest-cov`), including empty-message and max-length (1600 char) edge cases
- **`sms-service` AI integration**:
  - Calls `ai-service` synchronously on every capture (`Promise.all` for OTP/classify/spam) with a 2s timeout — enrichment is best-effort and never blocks or fails a capture; `ai-service` being down degrades to `null`/`not detected`
  - Replay reuses the original message's OTP/category/spam verdict instead of re-calling `ai-service` for identical content
  - New `otp`, `category`, `is_spam` columns on `messages`; `is_spam` also has a manual override endpoint (`PATCH /api/v1/messages/{id}/spam`) so a user can correct a false positive
  - `GET /api/v1/messages` gained a `category` and `is_spam` filter, in addition to the existing `to`/`from`/date-range filters
  - Publishes each capture to a Redis Stream (`sms.messages.created`, see [docs/redis.md](docs/redis.md)) for `worker` to consume — best-effort, same non-blocking philosophy as the `ai-service` calls
- **`worker` (Go)** — new service:
  - `cmd/worker` + `internal/consumer`/`internal/queue`/`internal/aiclient`, idiomatic Go layout matching `gateway`
  - Consumes `sms.messages.created` via a Redis Streams consumer group (`XREADGROUP`/`XACK`), calling `ai-service`'s `/classify` for each entry — demonstrates the async processing path alongside `sms-service`'s synchronous fast-path enrichment
  - Graceful shutdown on `SIGINT`/`SIGTERM` (`signal.NotifyContext`), verified to stop cleanly mid-poll
- **Dashboard**:
  - OTP badge on the inbox list, prominent OTP display with copy-to-clipboard on message detail
  - Classification tag (transactional/marketing/other) on list and detail views, plus a category filter
  - Spam flag on list/detail, a spam filter (all/hide/only), and a "Not spam" manual override button
  - "Generate test data" button on the inbox (count capped at 20, confirmation required above 5) — generated messages are captured via the same `POST /api/v1/messages` endpoint a real integration would use, so they appear in the inbox live over the existing WebSocket feed
- **Docker**: multi-stage `Dockerfile`s for `ai-service` (slim Python, runtime deps only — `pytest`/`httpx` split into `requirements-dev.txt`) and `worker` (static Go binary on Alpine, matching `gateway`'s pattern); both wired into `docker-compose.yml`

### Known gaps

- `docker`/`podman` were unavailable in the environment this was built in; verification was done by replicating the same request paths with real processes (including a live Redis Streams publish → consume → `ai-service` call) instead of `docker compose up` (same constraint as [0.3.0](#030---2026-07-20)).
- `worker`'s queue consumption is a working demonstration of the async path (classify + log), not a full reprocessing/retry pipeline — see [docs/redis.md](docs/redis.md) for what's realized vs. originally scoped.

## [0.3.0] - 2026-07-20

Provider-compatible endpoints, multi-tenancy (organizations/teams), message templates, and export, per the [v0.3 roadmap](README.md#roadmap). No new services were added this release — everything ships as new endpoints/tables on the existing four services, so `docker-compose.yml` is unchanged from v0.2.0.

### Added

- **Provider-compatible endpoints (`sms-service`)** — drop-in replacements for popular SMS providers' send APIs, so an app can point its existing SDK at SMSPit by swapping the base URL alone:
  - `POST /providers/vonage/sms/json` — accepts form or JSON, Vonage's response shape
  - `POST /providers/sns` — hand-built XML response matching AWS SNS's `PublishResponse`
  - `POST /providers/messagebird/messages` — handles MessageBird's string/CSV/array recipient formats
  - Unauthenticated by design (outside `/api/v1`) and outside the versioned prefix, matching the "swap the base URL, nothing else" premise; see [docs/api/provider-compatibility.md](docs/api/provider-compatibility.md)
- **Multi-tenancy (`auth-service` + `sms-service` + `dashboard`)**:
  - `organizations` and `teams` tables, admin-only CRUD (`OrganizationPolicy`) behind Laravel's authorization system, bridged from the existing API-key middleware via `Auth::setUser()`
  - `messages`, `api_keys`, and `templates` gained a nullable `org_id` — `NULL` is an "ungrouped" bucket, not a wildcard, so ungrouped keys never see another organization's data and vice versa
  - Org-scoping applied uniformly across REST queries and the WebSocket broadcast feed, so live updates respect the same isolation as search/list
  - Dashboard organization/team switcher, persisted to `localStorage`
- **Message templates (`sms-service` + `dashboard`)**:
  - Full CRUD (`GET`/`POST`/`PATCH`/`DELETE /api/v1/templates`), org-scoped like messages and keys
  - `{{variable}}` placeholder syntax with a template picker UI that fills in variables before sending
- **Export (`sms-service` + `dashboard`)**:
  - `GET /api/v1/messages/export?format=csv|json`, streamed as an attachment with the same filters as list/search
  - Dashboard export button with a format selector and loading state, downloading via a fetched blob + object URL (the only way to attach the required `Authorization` header to a triggered file download)
  - `Content-Disposition` explicitly exposed via CORS at both `sms-service` and the `gateway`, since it isn't a "simple" response header and is otherwise unreadable by cross-origin `fetch()` — without it, downloads silently fell back to a generic filename

### Known gaps

- `docker`/`podman` were unavailable in the environment this was built in; verification was done by replicating the same request paths with real processes instead of `docker compose up` (same constraint as [0.2.0](#020---2026-07-19)).
- `ai-service` and `worker` are not part of this release — they land in v0.4 per the roadmap.

## [0.2.0] - 2026-07-19

Authentication, API keys, replay, statistics, and real-time updates, per the [v0.2 roadmap](README.md#roadmap). All four services that make up the sandbox's request path (`gateway`, `auth-service`, `sms-service`, `dashboard`) now exist and are wired together.

### Added

- **`auth-service` (Laravel)** — users and API keys:
  - `POST /api/api-keys` — generate a key, returning the plaintext `{lookup}.{secret}` once; only its hash is ever stored
  - `GET /api/api-keys` — list keys newest-first, without the secret hash
  - `DELETE /api/api-keys/{id}` — revoke a key (sets `revoked_at`, idempotent, never hard-deletes)
  - `GET /api/api-keys/validate` — validate a bearer token, used internally by `sms-service` and `gateway`
  - Key generation/list/revoke are intentionally unauthenticated: generating the first key is how you'd bootstrap auth in the first place
- **`gateway` (Go)** — the front door for the sandbox:
  - Path-based reverse-proxy routing: `/api/v1/*` → `sms-service`, `/auth/*` → `auth-service` (rewritten to `/api/*`), `/ws` → `sms-service`'s WebSocket feed
  - Enforces API-key auth on `/api/v1/*` (validated against `auth-service`), forwarding the resolved identity downstream via `X-Api-Key-Id`/`X-Owner-Id`/`X-Api-Key-Scopes` headers
  - WebSocket passthrough via Go's `httputil.ReverseProxy`, which hijacks and forwards `Upgrade` requests transparently
- **`sms-service`**:
  - API-key auth guard on all `/messages` routes (validated against `auth-service`)
  - `POST /api/v1/messages/{id}/replay` — re-captures a message's `to`/`from`/body as a new entry, linked back via `replayed_from`
  - `GET /api/v1/statistics` — total/by-status/by-day message counts
  - WebSocket gateway at `/ws` (raw `ws`, not socket.io) broadcasting `sms.messages.created` on every capture/replay; connections authenticate via a `?token=` query param, since browsers can't set custom headers on a WS handshake
- **`dashboard`**:
  - Replay button on the message detail view, with confirmation and a success/failure toast
  - Statistics page: total/captured/failed metric cards and a message-volume-by-day bar chart
  - Live inbox updates over WebSocket, with exponential-backoff reconnect
  - API key management page: list/create/revoke, key metadata, copy-to-clipboard for a newly generated key
- **Docker**: multi-stage `Dockerfile`s for `auth-service` (nginx + php-fpm under supervisord, single container) and `gateway` (static Go binary on Alpine); both wired into `docker-compose.yml` alongside the existing services

### Known gaps

- `docker`/`podman` were unavailable in the environment this was built in, so `docker compose up` itself is unverified. What's verifiable without it was verified instead: the gateway's exact build+run commands via the host Go toolchain, `auth-service`'s exact `composer install` step, and the full request path (including WebSocket passthrough) replicated with real processes on the same URLs/ports compose wires up. Re-verify with `docker compose up` where Docker is available.
- The dashboard's API key management page calls `auth-service` directly (`VITE_AUTH_SERVICE_URL`), not through the gateway — its routes aren't rewritten to match the gateway's `/auth/*` → `/api/*` convention.
- No UI exists yet for creating the `owner_id` a key needs; users are still created manually. Organizations/teams (v0.3) will replace this.
- `ai-service` and `worker` are not part of this release — they land in v0.4 per the roadmap.

## [0.1.0] - 2026-07-19

First runnable release: SMS capture, search, and a dashboard to inspect what was captured, per the [v0.1 roadmap](README.md#roadmap).

### Added

- **`sms-service` (NestJS)** — REST API for message capture and retrieval:
  - `POST /api/v1/messages` — capture a message, returns it with a generated `sms_*` id
  - `GET /api/v1/messages` — list messages, newest first, paginated (`limit`/`offset`, default 20/max 100) and filterable (`to`, `from`, `created_after`, `created_before`)
  - `GET /api/v1/messages/{id}` — message detail, 404 on unknown id
  - `DELETE /api/v1/messages` — bulk delete by id, or a confirmed full wipe
  - Standardized error responses (`{ code, message, details }`) across all endpoints
  - Postgres-backed (via TypeORM), schema owned by `auth-service`'s Laravel migrations (see [docs/architecture.md](docs/architecture.md#database-migrations))
- **`dashboard` (React + Vite)** — web UI:
  - Inbox page: message list with status badges, loading skeleton, empty state, and an error banner with retry
  - Message detail page with full metadata, reachable by clicking/tabbing a row
  - Search/filter UI (`to`, `from`, date range) with debounced input, wired to the same query params `sms-service` supports
  - Talks to `sms-service` directly for now (env-configured `VITE_API_BASE_URL`); will switch to routing through `gateway` once that exists (v0.2)
- **Shared contract**: `proto/sms/v1/message.proto` and [docs/api/message-mapping.md](docs/api/message-mapping.md) documenting the REST↔proto field mapping
- **Docker**: multi-stage `Dockerfile`s for `sms-service` and `dashboard` (the latter with runtime env injection for the API base URL, since Vite bakes env vars at build time otherwise); wired into `docker-compose.yml` alongside Postgres and Redis
- **CI**: GitHub Actions runs editorconfig lint plus `sms-service`'s unit, coverage, and integration test suites against a real Postgres service container on every push/PR to `main`

### Known gaps

- `docker compose up` itself is unverified in the environment this was built in (no Docker available); the Dockerfiles and compose wiring were reviewed and built successfully, but not run end-to-end as containers. Same for `docker compose config` validation from Day 2.
- `auth-service`, `gateway`, `ai-service`, and `worker` are not part of this release — they land in v0.2+ per the roadmap.
