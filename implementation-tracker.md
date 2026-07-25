# Implementation Tracker (AI-agent internal use)

This file is maintained **by the AI agent, for the AI agent** — a working model of what's actually implemented, in progress, or pending, kept more current than `checklist.md`'s day-level checkboxes. It is not a substitute for `checklist.md` (the source of truth for build order/scope) or the README (product description); it exists so a fresh session can quickly answer "is X done?" without re-deriving it from a full checklist read.

Update this file in the same change whenever a checklist day's status changes — see the "Implementation tracker" rule in `CLAUDE.md`.

Status values: `done`, `in-progress` (partially complete, blocked, or unverifiable in this environment), `pending` (not started).

Last updated: 2026-07-25 (Days 101–103 merged; Days 104–105 pending).

---

## Phase 0 — Foundation (Days 1–10)

| Day | Status | Notes |
|---|---|---|
| 1 | done | |
| 2 | in-progress | `docker compose config` validation not run — no `docker` in this environment |
| 3–10 | done | |

## Phase 1 — v0.1 (Days 11–30)

| Day | Status | Notes |
|---|---|---|
| 11–25 | done | |
| 26 | in-progress | Dockerfile written, image build/run not verified (no Docker in this environment) |
| 27 | in-progress | Dockerfile written, production build serve not verified (no Docker) |
| 28 | done | |
| 29 | pending | End-to-end smoke test requires a running `docker compose up` stack — not runnable in this environment |
| 30 | done | v0.1.0 tagged |

## Phase 2 — v0.2 (Days 31–50)

| Day | Status | Notes |
|---|---|---|
| 31–47 | done | |
| 48 | in-progress | Dockerfiles written; standalone container run not verified (no Docker) — build/composer-install verified directly on host toolchain instead |
| 49 | done | Compose wiring done; WebSocket passthrough verified via live host processes, not `docker compose up` |
| 50 | done | v0.2.0 tagged |

## Phase 3 — v0.3 (Days 51–65)

| Day | Status | Notes |
|---|---|---|
| 51–65 | done | |

## Phase 4 — v0.4 (Days 66–80)

| Day | Status | Notes |
|---|---|---|
| 66–79 | done | |
| 80 | in-progress | CHANGELOG/README updated; `v0.4.0` tag not cut (superseded — repo went on to tag v1.0.0–v1.0.2 directly, see Day 100) |

## Phase 5 — v1.0 (Days 81–100)

| Day | Status | Notes |
|---|---|---|
| 81 | done | Manifests validated via PyYAML parse + cross-check, not `kubectl --dry-run` (unavailable) |
| 82 | done | Validated via `helm lint`/`helm template`, not a real cluster install (no kind/minikube/Docker) |
| 83 | done | Traces verified per `docs/observability.md` method (no real collector in this environment) |
| 84–86 | done | |
| 87 | done | Security review complete; env-vars-only secrets management is a deliberate scope decision, not a gap |
| 88 | done | Load test bottleneck found & fixed (auth-service single-threaded dev server) |
| 89–94 | done | SDKs (PHP/Go/Node/Python) built and tested against the live stack; publishing to package registries deferred (no registry credentials in this environment) |
| 95 | done | CI extended; staging deploy job added but unverified end-to-end (no real staging cluster) |
| 96 | done | Images published to GHCR as of `v1.0.2`; local pull/run not verified (no Docker) |
| 97 | done | |
| 98 | done | Full QA pass found & fixed a real bug: provider-compatible adapters were unreachable through the gateway |
| 99 | done | |
| 100 | in-progress | `v1.0.0`→`v1.0.2` tagged and released; "announce the release" sub-task is out of agent scope (no social/community channel access) |

## Phase 6 — v1.1: Dashboard Feature Completeness (Days 101–105)

| Day | Status | Notes |
|---|---|---|
| 101 | done | Org/team management UI shipped (PR merged to `main`). One sub-task deferred: slug-uniqueness 422 shows a generic toast instead of the server's specific message — needs a shared `ApiError` client-layer change (see Known follow-ups) |
| 102 | done | Standalone `/templates` page shipped, plus extracted shared `detectVariables` helper (`dashboard/src/lib/templateVariables.ts`) so Compose's picker and the new page don't duplicate the `{{variable}}`-detection regex |
| 103 | done | Observability nav links shipped (Jaeger/Prometheus/Grafana), threaded through the same runtime-config-injection pattern as every other dashboard URL |
| 104 | pending | Bulk message actions (multi-select + bulk delete) in Inbox |
| 105 | pending | AI Tools page (live otp/classify/spam preview) |

---

## Known follow-ups / deferred items (not tied to a specific pending day)

- **`ApiError` doesn't carry the response body.** `dashboard/src/api/client.ts`'s `ApiError` only captures HTTP `status`, not the parsed error body — so callers can't surface server-specific validation messages (e.g. slug-uniqueness 422 on org create, the two distinct 422 causes on team-member-add). Fixing this is a shared client-layer change affecting every API call in the dashboard, flagged during Day 101 but out of that day's scope. No checklist day currently owns this — raise it as a candidate before/alongside Day 102+ work if it blocks a future day's UX.
- **Org slug is not editable from any UI.** Auto-derived server-side on create, never exposed for edit. Deferred alongside the `ApiError` item above (Day 101 notes).
- **Docker is now available in this environment** (installed 2026-07-25, data-root on `/mnt/200GB`; see `docker-compose.yml`/`.env`) — the older blanket "no docker/podman available" caveat on days 2, 26, 27, 29, 48, 49 no longer applies; those were re-verified live via `docker compose up -d` after Docker was installed. `kubectl`/`kind`/`minikube` are still unavailable, so days 81/82/88/96's Kubernetes-specific verification gaps (manifest validation / `helm template` only, no real cluster run) still stand.
- **Identity/auth is not real multi-tenant-safe yet — found during a Day 101 follow-up investigation, not yet assigned to a day.** `auth-service`'s key-management routes (`POST/GET /api-keys`, `DELETE`, `/rotate`) sit outside the `api.key` middleware entirely — unauthenticated, can mint/list/revoke/rotate any org's keys. `owner_id` on key creation is a free-typed integer with no verification the caller *is* that user. No login/session/password auth exists anywhere (no Sanctum/Passport/JWT installed, `User.password` is unused scaffold). No user-registration or user-directory/search endpoint exists at all — the only way to create a user is `php artisan tinker`. This is documented as an intentional, acknowledged gap in `docs/security.md` and the README ("intentionally unauthenticated... pending a real bootstrap-credential design"), not a silent oversight, but it means the org/team isolation Day 101 built UI for is not actually enforced against a malicious actor on the same network. Raise as a candidate day if/when asked to harden this.
