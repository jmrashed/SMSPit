# ai-service

OTP detection, message classification, spam detection, and test-data generation (FastAPI).

**Status:** v0.4 complete (Days 66–79): health check, `/detect-otp`, `/classify`, `/detect-spam`, `/generate-test-data`, consumed by `worker` via the Redis Streams queue (see [docs/redis.md](../docs/redis.md)), and has a Dockerfile.

## Endpoints

- `GET /health` — health check
- `POST /detect-otp` — regex-based OTP extraction
- `POST /classify` — rule-based category (otp/transactional/marketing/other)
- `POST /detect-spam` — keyword/heuristic spam scoring
- `POST /generate-test-data` — synthetic SMS sample generator (`count`, `type`)

## Local development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

`requirements.txt` has runtime deps only (what the Docker image installs); `requirements-dev.txt` adds `pytest`/`pytest-cov`/`httpx` on top for local test runs.

## Tests

```bash
pytest
```

Runs with coverage reporting (`pytest-cov`, configured in `pytest.ini`); currently 100% statement coverage.
