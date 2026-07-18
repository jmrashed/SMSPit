# SMSPit Documentation

Per-service documentation for the SMSPit platform. Each service doc covers its stack, status, responsibilities, and planned features/functionality, sourced from the [root README](../README.md) and [checklist.md](../checklist.md).

- [Architecture Overview](architecture.md)
- [gateway](gateway.md) — API Gateway (Go)
- [auth-service](auth-service.md) — Authentication & API Keys (Laravel)
- [sms-service](sms-service.md) — SMS Capture, Search, Replay (NestJS)
- [ai-service](ai-service.md) — OTP Detection, Classification, Spam Detection (FastAPI)
- [worker](worker.md) — Background Job Consumer (Go)
- [dashboard](dashboard.md) — Web Dashboard (React)

**Status:** All services are in the planning stage — see each doc's Status section and the root [checklist.md](../checklist.md) for build progress.
