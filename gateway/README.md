# gateway

API Gateway (Go) — routes and authenticates requests to the auth-service, sms-service, and ai-service.

**Status:** Base server, path-based routing to sms-service (`/api/v1/*`) and auth-service (`/auth/*`), API-key auth enforcement on `/api/v1/*` (validated against auth-service, identity forwarded downstream via headers), and per-org rate limiting on `/api/v1/*` (Day 86, see [docs/multi-tenancy.md](../docs/multi-tenancy.md#hardening-audit-day-86)) are implemented. See the root [README](../README.md#roadmap) for the overall roadmap.
