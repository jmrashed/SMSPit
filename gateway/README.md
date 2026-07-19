# gateway

API Gateway (Go) — routes and authenticates requests to the auth-service, sms-service, and ai-service.

**Status:** Base server and path-based routing to sms-service (`/api/v1/*`) and auth-service (`/auth/*`) are implemented. Gateway-level auth enforcement is not yet implemented (see checklist Day 39). See the root [README](../README.md#roadmap) for the overall roadmap.
