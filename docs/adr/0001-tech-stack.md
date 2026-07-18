# 0001: Tech stack per service

## Status

Accepted

## Context

SMSPit is a self-hosted SMS sandbox split into six services (`gateway`, `auth-service`, `sms-service`, `ai-service`, `worker`, `dashboard`), each independently deployable and owning its own runtime. Each needed a language/framework choice made early, since it drives the whole service's directory layout, tooling, and how it's containerized.

## Decision

| Service | Stack | Why |
|---|---|---|
| `gateway` | Go | Sits on the request hot path for every call into the system; needs low memory footprint and low-latency reverse-proxying. Go's standard `net/http` plus a lightweight router (chi/gin) is enough — no need for a heavier framework at the edge. |
| `auth-service` | Laravel (PHP) | Users, API keys, orgs, teams are CRUD- and auth-heavy — Laravel's batteries-included ecosystem (Eloquent, migrations, validation, Sanctum-style auth patterns) covers this domain with minimal custom code. |
| `sms-service` | NestJS (TypeScript) | The core service: REST API, WebSocket live updates, provider-adapter endpoints. NestJS's modular structure (modules/controllers/services) fits a service with many endpoints and evolving sub-domains (messages, providers, templates), and TypeScript's typing pairs naturally with the shared `proto/` contracts. |
| `ai-service` | FastAPI (Python) | OTP detection, classification, and spam scoring are Python's strength — access to the ML/NLP ecosystem if rule-based approaches need to grow into model-based ones later. FastAPI gives async request handling and automatic OpenAPI generation with minimal boilerplate. |
| `worker` | Go | A long-running queue consumer calling `ai-service`; needs to be a small, cheap, always-on process. Reuses the same language as `gateway`, so the team isn't maintaining a third systems-language stack for infra-shaped services. |
| `dashboard` | React (Vite) | The UI needs live updates (WebSocket), search/filter interactivity, and a component-heavy surface (inbox, detail view, stats, template picker) — React's component model and ecosystem (React Query/SWR, routing) fit that directly. Vite over CRA for faster local dev iteration. |

Data layer: PostgreSQL (single shared instance — see [`docs/architecture.md`](../architecture.md#database-migrations)) and Redis (pub/sub + queue for v0.1–v0.3, see [`docs/redis.md`](../redis.md)), with NATS/Kafka deferred until horizontal scaling is a real requirement.

## Trade-offs considered

- **Polyglot cost vs. fit-for-purpose.** Five languages/frameworks across six services is more operational surface (five sets of tooling, five sets of CI steps, five Dockerfile patterns) than a single-stack monolith or a uniform polyglot-but-minimal set (e.g. everything in Node or everything in Go). We accepted this because SMSPit's own pitch is "match each service's ecosystem so its code is legible to developers who already know that framework" (see [CLAUDE.md](../../CLAUDE.md)) — a NestJS developer shouldn't have to learn Go idioms to contribute to `sms-service`, and vice versa.
- **Go for `gateway`/`worker` vs. Node for everything.** Considered keeping `gateway` and `worker` in Node/NestJS to reduce the language count to three. Rejected: both are infrastructure-shaped (edge proxy, queue consumer) where Go's lower memory footprint, static binary deployment, and mature concurrency primitives matter more than ecosystem reuse — and neither needs a web framework's request/response feature set.
- **Laravel for `auth-service` vs. NestJS.** Considered building auth inside `sms-service` or a second NestJS service, to reduce the stack to Go + Node + Python. Rejected: Laravel's migration/ORM/auth conventions are mature and fast to build correctly (security-sensitive domain), and keeping auth as a separate Laravel service also let it become the single migration owner (see ADR-adjacent decision in `docs/architecture.md`) without forcing Postgres schema management into NestJS/TypeORM.
- **FastAPI for `ai-service` vs. a Node/Go ML wrapper.** Considered keeping AI logic in `worker` (Go) calling out to a hosted model API only, with no dedicated Python service. Rejected: starting with regex/rule-based detection (Day 67) that may grow into local model inference later; Python keeps that migration path open without a rewrite, whereas Go would mean rewriting into Python anyway once local models are needed.
- **React vs. Vue/Svelte for `dashboard`.** Considered Vue (also PHP/Laravel-ecosystem-adjacent) and Svelte (smaller bundle). Rejected both in favor of React for ecosystem maturity around the specific features `dashboard` needs (WebSocket state management, data tables, date-range pickers) and larger contributor familiarity for an open-source tool.

## Consequences

- CI (Day 3, Day 95) needs per-language build/test steps rather than one uniform pipeline.
- Cross-service contracts must go through `proto/` or REST/WebSocket — no shared in-process types, so the `proto/sms/v1/message.proto` + REST mapping doc (Day 4) carries more weight than it would in a single-language stack.
- Docker images (Days 26, 27, 48, 79) need five different base-image strategies (Go static binary, PHP-FPM, Node, Python, static Nginx/Node for the built dashboard) rather than one.
