# Contributing to SMSPit

Thanks for considering a contribution. SMSPit is now feature-complete through v1.0 (see [checklist.md](checklist.md) and [CHANGELOG.md](CHANGELOG.md)), so most changes from here are bug fixes, hardening, or net-new features beyond the original 100-day plan — read the relevant service's existing code and docs before adding to it.

## Before you start

1. Check [checklist.md](checklist.md) for what's already built and what's still open (Java/.NET SDKs, additional provider adapters, SDK registry publishing).
2. For anything beyond a small fix, open an issue first describing what you want to change and why — this avoids duplicated or conflicting work, especially across the 5 languages/frameworks this repo spans.
3. [CLAUDE.md](CLAUDE.md) documents this repo's working conventions in full (coding style, testing expectations, git conventions, Docker/Compose patterns) — read it before your first PR. The summary below hits the parts that matter most for a first contribution.

## Development setup

- `scripts/setup.sh` installs dependencies and copies each service's `.env.example`.
- `scripts/dev-up.sh` runs `gateway`, `auth-service`, `sms-service`, and `dashboard` together without Docker (needs a local Postgres and Redis already running).
- `docker-compose.yml` wires up the full stack including `ai-service`, `worker`, and the observability stack (Jaeger/Prometheus/Grafana) — the preferred way to run everything at once if you have Docker.
- See [docs/local-dev-setup.md](docs/local-dev-setup.md) for the full manual walkthrough.

## Ground rules

- **Keep services isolated.** Each service (`gateway/`, `auth-service/`, `sms-service/`, `ai-service/`, `worker/`, `dashboard/`) owns its own folder, Dockerfile, and dependency manifest. They talk to each other only over their defined REST/WebSocket/queue interfaces — never by importing another service's internals.
- **Match each service's ecosystem conventions** (NestJS modules, Laravel's `app/Http/Controllers` + `app/Models`, idiomatic Go `cmd/`/`internal/`) rather than inventing a custom layout.
- **Every new endpoint needs**: input validation, a consistent error response shape (`{code, message, details}`), and at least one test in the same change.
- **No commented-out code or TODO placeholders** in a merged PR — either finish it or open an issue to track it.
- **Environment-specific values go through `.env`/`.env.example`**, never hardcoded.

## Testing

Run the relevant service's suite before opening a PR:

| Service | Command |
|---|---|
| `gateway`, `worker` | `go test ./...` |
| `auth-service` | `php artisan test` |
| `sms-service` | `npm run test:cov && npm run test:e2e` |
| `ai-service` | `pytest` |
| `dashboard` | `npm run lint && npm run build` |
| SDKs (`sdks/*/`) | see each SDK's own README |

CI (`.github/workflows/ci.yml`) runs all of the above on every PR — a PR won't merge with a red build.

## Commit and PR conventions

- Prefer small, scoped commits (one logical change per commit) over bundling unrelated changes.
- Commit messages should explain *why*, not restate the diff.
- Open a PR against `main`; CI must pass before review.

## Reporting bugs / requesting features

Open a GitHub issue. For bugs, include: what you expected, what happened instead, and the exact steps/request to reproduce it (a `curl` command is ideal for API bugs).
