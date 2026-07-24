# SMSPit Documentation

Per-service and operational documentation for the SMSPit platform, v1.0.2. This folder also builds into a hosted [VitePress documentation site](index.md) — for the full navigable version, see the deployed site or `docs/index.md`.

**Status:** All six services are implemented and released (v1.0.2) — see each doc's Status line and [CHANGELOG.md](changelog.md) for the version-by-version detail, and [checklist.md](https://github.com/jmrashed/SMSPit/blob/main/checklist.md) for the full build history.

## Services

- [gateway](gateway.md) — API Gateway (Go)
- [auth-service](auth-service.md) — Authentication & API Keys (Laravel)
- [sms-service](sms-service.md) — SMS Capture, Search, Replay (NestJS)
- [ai-service](ai-service.md) — OTP Detection, Classification, Spam Detection (FastAPI)
- [worker](worker.md) — Background Job Consumer (Go)
- [dashboard](dashboard.md) — Web Dashboard (React)

## Guide

- [Architecture Overview](architecture.md)
- [Getting Started](getting-started.md)
- [Local Development Reference](local-dev-setup.md)
- [FAQ](faq.md)
- [Troubleshooting](troubleshooting.md)
- [Glossary](glossary.md)

## API

- [OpenAPI Reference](openapi/site/index.html)
- [Message Mapping](api/message-mapping.md)
- [Provider Compatibility](api/provider-compatibility.md)
- [WebSocket API](websocket.md)
- [Templates](templates.md)
- [Export](export.md)
- [API Key Rotation](api-key-rotation.md)
- [Organizations and Teams](organizations-and-teams.md)
- [Rate Limiting](rate-limiting.md)
- [Generate Test Data](generate-test-data.md)

## SDKs

- [SDK Overview](sdks.md) — [PHP](sdk-php.md), [Go](sdk-go.md), [Node.js](sdk-nodejs.md), [Python](sdk-python.md)

## Operations

- [Multi-tenancy](multi-tenancy.md)
- [Redis and Queues](redis.md)
- [Security](security.md)
- [Observability](observability.md)
- [Load Testing](load-testing.md)
- [Testing](testing.md)
- [Production Deployment](production-deployment.md)
- [Container Registry](registry.md)
- [Kubernetes](kubernetes.md) / [Helm](helm.md)
- [Upgrading](upgrading.md)

## Project

- [Changelog](changelog.md)
- [QA Pass](qa-pass.md)
- [ADR: Tech Stack](adr/0001-tech-stack.md)
- [Contributing](https://github.com/jmrashed/SMSPit/blob/main/CONTRIBUTING.md)

## Source of truth (avoiding drift)

Some content in this folder is generated or mirrored from elsewhere in the repo rather than being hand-written here. Where that's the case, the canonical location and how drift is prevented:

| Content | Canonical location | How this copy stays in sync |
|---|---|---|
| Changelog | [`CHANGELOG.md`](https://github.com/jmrashed/SMSPit/blob/main/CHANGELOG.md) (repo root) | `docs/changelog.md` uses a VitePress `@include` — it's the live file, not a copy, so it cannot drift |
| OpenAPI spec | [`docs/openapi/openapi.yaml`](openapi/openapi.yaml) | `docs/public/openapi/openapi.yaml` (served as a static asset on the built site) must be manually re-copied after edits — see the note at the top of that file's directory |
| Logo/screenshot assets | [`docs/assets/`](https://github.com/jmrashed/SMSPit/tree/main/docs/assets) | `docs/public/assets/` (VitePress's static-asset root) must be manually re-copied after changes |
| SDK READMEs | [`sdks/*/README.md`](https://github.com/jmrashed/SMSPit/tree/main/sdks) | `docs/sdk-{php,go,nodejs,python}.md` are manually-synced copies with absolute GitHub links substituted for relative ones (which wouldn't resolve on the docs site) — each carries a "mirrored from" notice at the top |
| Kubernetes/Helm READMEs | [`deployments/k8s/README.md`](https://github.com/jmrashed/SMSPit/tree/main/deployments/k8s), [`deployments/helm/smspit/README.md`](https://github.com/jmrashed/SMSPit/tree/main/deployments/helm/smspit) | Same manual-sync pattern as the SDK READMEs above |
| Environment variables | Each service's own `.env.example` | [Production Deployment](production-deployment.md#environment-variable-reference)'s table is a curated summary, not exhaustive — the `.env.example` files are authoritative for defaults |

If you're editing any of the "canonical location" column, remember to re-sync the corresponding docs-site copy in the same change.
