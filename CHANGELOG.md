# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
