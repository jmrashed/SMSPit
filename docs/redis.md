# Redis usage

Design decisions for how Redis is used across SMSPit. This is a design doc, not an implementation — pub/sub is wired up when `sms-service`'s WebSocket feed lands (v0.2, [checklist.md](../checklist.md) Days 40–47) and consumed by `worker` (v0.4, Days 77–78).

## Pub/sub channel naming convention

Dot-separated, hierarchical, matching the `<domain>.<resource>.<event>` shape so channels can map directly onto NATS subjects if/when the queue migrates (see below):

| Channel | Published by | Consumed by | Event |
|---|---|---|---|
| `sms.messages.created` | `sms-service` | dashboard (via WebSocket relay), `worker` | A message was captured |
| `sms.messages.updated` | `worker` | dashboard (via WebSocket relay) | AI enrichment (OTP/classification/spam) finished for a message |

No organization/tenant scoping in the channel name for v0.1 — multi-tenancy (API keys, orgs) isn't part of v0.1 scope (see [README roadmap](../README.md#roadmap)). Once auth lands in v0.2, channels scope to `sms.messages.{org_id}.created` / `...updated`; `sms-service`'s WebSocket layer subscribes per-connection to the channel matching the authenticated org.

## Caching strategy for v0.1

None. v0.1's data volume (a local dev/test sandbox, not production traffic) doesn't justify a cache layer in front of PostgreSQL — list/search/detail endpoints query Postgres directly. Revisit only if a specific endpoint proves slow under real usage; adding caching speculatively would be premature optimization for a tool whose whole point is transparent inspection of recent data.

Redis's only v0.1 role is as the pub/sub and queue backend described above and in [`docker-compose.yml`](../docker-compose.yml) — not as a cache.

## Deferring NATS/Kafka

v0.1–v0.3 use Redis pub/sub and Redis Streams (for the `worker` queue) exclusively. NATS/Kafka are listed in the [tech stack](../README.md#tech-stack) as future options for higher-throughput, multi-instance deployments, but adding either now would be infrastructure ahead of need — SMSPit has no multi-instance or high-throughput requirement until later phases. Revisit if/when horizontal scaling of `worker`/`sms-service` becomes a real requirement, not preemptively.
