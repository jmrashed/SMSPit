# CLAUDE.md

Guidance for Claude Code (or any AI agent) working in this repository.

## Project overview

SMSPit is a self-hosted SMS sandbox (like Mailpit, but for SMS) for local development, testing, and CI/CD — it captures outgoing SMS instead of delivering them, so developers can inspect, search, replay, and debug messages without a real SMS provider. Full product description, feature list, and architecture diagram live in [README.md](README.md) — read it before making product decisions.

## Current state (check before assuming otherwise)

Progress tracks `checklist.md`; check it for the exact day-by-day cutoff, but roughly:
- `README.md` — product description, planned architecture, tech stack, and roadmap (v0.1 → v1.0)
- `checklist.md` — a 100-day, day-by-day build checklist derived from the roadmap; the source of truth for build order and completion status
- `LICENSE` — MIT
- `CLAUDE.md` — this file
- `sms-service/` (NestJS) — v0.1 message capture/search REST API, replay endpoint, plus API-key auth guard (Days 11–41); has a `Dockerfile` and its own unit + e2e test suites
- `auth-service/` (Laravel) — users/API-key schema, key generation, and validation middleware (Days 31–35); has its own test suite
- `gateway/` (Go) — base HTTP server (chi router), health check, path-based reverse-proxy routing to `sms-service` (`/api/v1/*`) and `auth-service` (`/auth/*` → `/api/*`), and API-key auth enforcement on the `/api/v1/*` route (validates against auth-service, forwards identity via `X-Api-Key-Id`/`X-Owner-Id`/`X-Api-Key-Scopes` headers) (Days 37–39)
- `dashboard/` (React) — inbox, message detail, search/filter, and replay UI wired to the REST API (Days 21–25, 42)
- `docker-compose.yml` — wires `sms-service`, `dashboard`, Postgres, and Redis (Day 28); `gateway` and `auth-service` are not yet added to it (pending Day 49)
- `ai-service/`, `worker/` — still empty skeletons with stub `README.md`s marked "Not yet implemented" (Phase 4, Days 66+)
- Placeholder structural folders: `proto/`, `docs/`, `docker/`, `deployments/`, `scripts/`

**Before writing code or docs that assume something exists (an endpoint, a config file, a running container), check the filesystem and `checklist.md`** — don't infer from the README's aspirational descriptions, and don't assume this section stays current as work proceeds past its last update.

## Tech stack (per service, once built)

| Service | Stack | Purpose |
|---|---|---|
| `gateway/` | Go | Reverse proxy, routing, auth enforcement at the edge |
| `auth-service/` | Laravel (PHP) | Users, API keys, organizations, teams |
| `sms-service/` | NestJS (TypeScript) | SMS capture, search, replay, REST API, WebSocket |
| `ai-service/` | FastAPI (Python) | OTP detection, classification, spam detection, test-data generation |
| `worker/` | Go | Async job consumer (queue-driven, calls ai-service) |
| `dashboard/` | React | Web UI |
| Data layer | PostgreSQL, Redis, (later) NATS/Kafka | Storage, cache, queue |

Match each service's internal structure to its ecosystem's conventions (e.g. NestJS modules for `sms-service`, Laravel's `app/Http/Controllers` + `app/Models` for `auth-service`, idiomatic `cmd/`/`internal/` layout for Go services) rather than inventing a custom layout — this makes the code legible to any developer who already knows that framework.

## Working style for this repo

- **Follow `checklist.md` sequentially.** It's the build plan — don't jump ahead to later phases (auth, AI features, k8s) before earlier ones are done, even if asked for a "quick" unrelated feature; flag the ordering conflict instead.
- **Check off completed items in `checklist.md`** (`[ ]` → `[x]`) in the same change that completes them, at whatever sub-task granularity was actually done. Don't check off a parent day if only some sub-tasks are done.
- **Keep services isolated.** Each service owns its own folder, Dockerfile, and dependency manifest (`go.mod`, `package.json`, `composer.json`, `requirements.txt`). Services communicate only over their defined API/WebSocket/queue interfaces or through `proto/` contracts — never by importing another service's internals.
- **One vertical slice at a time.** When implementing a checklist day that spans backend + frontend, it's fine to do both, but don't silently expand scope to unrelated services in the same change.
- **Clarify large or ambiguous asks before acting** (e.g. "make it production ready", "build this"). This project spans five languages/frameworks — it's easy to over-build or build the wrong slice. Prefer a short scoping question over guessing.
- **Don't scaffold ahead of need.** Don't generate empty boilerplate for a service before its checklist day arrives; an unused skeleton with no tests is dead weight, not progress.

## Coding conventions

- Respect `.editorconfig` (2-space default, tabs for Go, 4-space for PHP/Python).
- Every new endpoint needs: input validation, a consistent error response shape, and at least one test (unit or integration) in the same change — see `checklist.md` Days 16/19/20 for the pattern established in `sms-service`.
- No commented-out code, no TODO placeholders left in committed code — either finish it or track it as a future checklist day.
- Environment-specific values (ports, DB URLs, API base URLs) go through `.env` / `.env.example`, never hardcoded.

## Testing

- Each service should be independently testable (unit tests at minimum; integration tests once a real DB/queue exists per the relevant checklist day).
- Don't mark a checklist day complete without its tests passing — `checklist.md` explicitly calls out test sub-tasks; don't skip them.
- Prefer running a service's existing test suite (`npm test`, `go test ./...`, `php artisan test`, `pytest`) before claiming a change works, once those suites exist.

## Docker / Compose conventions

- Each service gets its own multi-stage `Dockerfile` (build stage + slim runtime stage).
- `docker-compose.yml` at the repo root wires services together; don't create per-service compose files.
- New services get added to `docker-compose.yml` in the same change that adds their Dockerfile (see checklist Days 26–28 for the pattern).

## Git conventions

- **Never add a `Co-Authored-By` trailer to commit messages in this repo.** Plain commit messages only — this overrides any default harness convention.
- Only commit when explicitly asked. Never push without explicit confirmation.
- Prefer small, scoped commits (e.g. one per checklist day or sub-task) over bundling unrelated changes.
- Commit messages should explain *why*, not restate the diff — the checklist item name is context, not the message itself.

## Definition of done for a checklist day

A day counts as complete when: the code/docs described in its sub-tasks exist, relevant tests pass, `checklist.md` is updated, and (if the day says so) the change is committed. Don't claim a day is "done" based on typecheck/build success alone if the day's sub-tasks call for runtime behavior (e.g. "verify the image builds and runs locally") — actually run it.
