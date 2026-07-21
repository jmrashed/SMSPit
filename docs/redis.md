# Redis usage

Design decisions for how Redis is used across SMSPit.

**Realized architecture (updated Day 78 — see [checklist.md](../checklist.md)):** the dashboard's live-update needs (v0.2, Days 40–47) turned out not to need Redis pub/sub at all — `sms-service`'s `RealtimeGateway` broadcasts directly to connected WebSocket clients in-process, since a single `sms-service` instance is sufficient for this self-hosted tool. Redis's only realized role is the Streams-backed job queue below, plus the synchronous, non-blocking AI enrichment calls `sms-service` makes directly to `ai-service` on capture (OTP/classification/spam — Days 68/71/73), which don't go through Redis at all. The queue is additive infrastructure for `worker`'s own async workloads (e.g. reprocessing, batch jobs, retries) built on top of the same `sms.messages.created` events.

## Streams channel naming convention

Dot-separated, hierarchical, matching the `<domain>.<resource>.<event>` shape so channels can map directly onto NATS subjects if/when the queue migrates (see below):

| Stream | Published by | Consumed by | Event |
|---|---|---|---|
| `sms.messages.created` | `sms-service` (`QueuePublisher`, Day 78) | `worker` (`internal/consumer`, Day 78) | A message was captured (fields: `id`, `to`, `from`, `message`, `org_id`) |

`worker` reads via a consumer group (`XREADGROUP`, group `worker`) and acks each entry after calling `ai-service` — see `worker/internal/consumer`. Publishing is best-effort: a Redis outage degrades to "no job queued," never blocks the capture request (same non-blocking philosophy as the `AiClient` calls).

No organization/tenant scoping in the stream name for v0.1–v0.4 — multi-tenancy (API keys, orgs) isn't part of the streamed payload yet (see [README roadmap](../README.md#roadmap)). Revisit if/when `worker` needs org-scoped processing.

## Caching strategy for v0.1

None. v0.1's data volume (a local dev/test sandbox, not production traffic) doesn't justify a cache layer in front of PostgreSQL — list/search/detail endpoints query Postgres directly. Revisit only if a specific endpoint proves slow under real usage; adding caching speculatively would be premature optimization for a tool whose whole point is transparent inspection of recent data.

Redis's only v0.1 role is as the pub/sub and queue backend described above and in [`docker-compose.yml`](../docker-compose.yml) — not as a cache.

## Deferring NATS/Kafka

v0.1–v0.3 use Redis pub/sub and Redis Streams (for the `worker` queue) exclusively. NATS/Kafka are listed in the [tech stack](../README.md#tech-stack) as future options for higher-throughput, multi-instance deployments, but adding either now would be infrastructure ahead of need — SMSPit has no multi-instance or high-throughput requirement until later phases. Revisit if/when horizontal scaling of `worker`/`sms-service` becomes a real requirement, not preemptively.
