# ai-service

AI-assisted message intelligence — OTP detection, classification, spam scoring, and synthetic test data.

## Stack

| Layer | Technology |
|---|---|
| Language/Framework | Python / FastAPI |
| Deployment | Docker, Kubernetes |

## Status

Not yet implemented. Planned for v0.4 — see [checklist.md](../checklist.md) Days 66–76.

## Responsibilities

- Detect OTP codes in captured message bodies
- Classify messages (transactional / marketing / OTP)
- Score messages for spam likelihood
- Generate synthetic SMS samples for testing

## Planned Features & Functionality

| Feature | Endpoint | Notes |
|---|---|---|
| OTP detection | `POST /detect-otp` | Regex-based baseline; extracted value stored on the message record |
| Message classification | `POST /classify` | Rule-based or ML classification into transactional/marketing/OTP |
| Spam detection | `POST /detect-spam` | Spam score; flagged messages surfaced in the dashboard |
| Test data generation | Generator endpoint | Produces synthetic OTP/marketing/transactional samples on demand |

## Directory layout (planned)

```
ai-service/
├── app/
│   ├── api/
│   ├── models/
│   └── main.py
├── tests/
├── Dockerfile
└── requirements.txt
```

## Depends on

- Called by `sms-service` (sync, on capture) and `worker` (async, via queue) — must degrade gracefully (non-blocking) if unavailable

## Depended on by

- `worker`, `sms-service`, `dashboard` (surfaces classification/OTP/spam results)
