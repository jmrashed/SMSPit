# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
