# ai-service

**Status: Implemented.** AI-assisted message intelligence — OTP detection, classification, spam scoring, and synthetic test data. Rule-based/regex, not a hosted ML model — see [FAQ](faq.md#is-ai-service-a-real-ml-model).

## Stack

| Layer | Technology |
|---|---|
| Language/Framework | Python / FastAPI |
| Deployment | Docker, Kubernetes (see [Kubernetes](kubernetes.md) / [Helm](helm.md)) |

## Responsibilities

- Detect OTP codes in message bodies (regex-based, keyword-adjacent match preferred over a bare digit run)
- Classify messages into `otp` / `transactional` / `marketing` / `other`
- Score messages for spam likelihood (keyword/heuristic scoring, flagged at ≥0.5)
- Generate synthetic SMS samples for exercising the dashboard/API without a real integration — see [Generate Test Data](generate-test-data.md)

**Not** reachable through the [gateway](gateway.md) — there is no `ai-service` route at the edge. It's called directly, and only by two callers:

- **`sms-service`**, synchronously, on every capture (2s timeout; degrades to `null`/"not detected" rather than failing the capture if unreachable)
- **`worker`**, asynchronously, off the Redis Streams queue (see [Redis and Queues](redis.md))

## API

| Feature | Endpoint | Notes |
|---|---|---|
| OTP detection | `POST /detect-otp` | Returns `{ otp: string \| null }` |
| Message classification | `POST /classify` | Returns `{ category: "otp" \| "transactional" \| "marketing" \| "other" }` |
| Spam detection | `POST /detect-spam` | Returns `{ is_spam: boolean, score: number }` |
| Test data generation | `POST /generate-test-data` | See [Generate Test Data](generate-test-data.md) |

No SMSPit API key is required to call ai-service directly — it's an internal helper with no data store of its own, not part of the authenticated API surface.

## Configuration

| Env var | Purpose |
|---|---|
| `PORT` | Listen port (default from `.env.example`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint, see [Observability](observability.md) |

## Directory layout

```
ai-service/
├── app/
│   ├── routers/     # detect-otp, classify, detect-spam, generate
│   ├── schemas/       # pydantic request/response models
│   ├── services/       # otp_detector.py, classifier.py, spam_detector.py, test_data_generator.py
│   └── main.py
├── tests/
├── requirements.txt
├── requirements-dev.txt
└── Dockerfile
```

## Testing

```sh
cd ai-service
python -m pip install -r requirements-dev.txt
pytest
```

See [Testing](testing.md) for the full-repo picture.

## Related documentation

- [Architecture Overview](architecture.md)
- [sms-service](sms-service.md) — synchronous caller
- [worker](worker.md) — asynchronous caller
- [Generate Test Data](generate-test-data.md)
- [Observability](observability.md)

## Depends on

- Nothing — stateless, no database, no other service calls

## Depended on by

- [worker](worker.md), [sms-service](sms-service.md); results surface in [dashboard](dashboard.md) as OTP/classification/spam tags
