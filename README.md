# SMSPit

> **The Sandbox for SMS.**
>
> A modern, self-hosted SMS sandbox for local development, testing, and CI/CD. Capture, inspect, search, replay, and debug SMS messages without sending real SMS to mobile networks.

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jmrashed/SMSPit" alt="License"></a>
  <a href="https://github.com/jmrashed/SMSPit/stargazers"><img src="https://img.shields.io/github/stars/jmrashed/SMSPit" alt="Stars"></a>
  <a href="https://github.com/jmrashed/SMSPit/issues"><img src="https://img.shields.io/github/issues/jmrashed/SMSPit" alt="Issues"></a>
</p>

> **Status: v0.2.0 released.** SMS capture/search/replay, the dashboard (inbox, detail, statistics, live WebSocket updates, API key management), and API-key authentication enforced at both `sms-service` and the `gateway` are live — see the [changelog](CHANGELOG.md) for what's actually runnable today. Everything else in this README (provider emulation, teams/organizations, AI features, Kubernetes) is still the v0.3+ roadmap, not yet built. Follow progress in [checklist.md](checklist.md). Per-service stack and feature docs live in [docs/](docs/).

---

## Table of Contents

- [Why SMSPit?](#why-smspit)
- [Planned Features](#planned-features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start-planned)
- [Example Usage](#example-planned-usage)
- [REST API](#rest-api-planned)
- [Dashboard Features](#dashboard-features)
- [Provider Compatibility](#provider-compatibility)
- [Roadmap](#roadmap)
- [SDKs](#sdks-planned)
- [Contributing](#contributing)
- [License](#license)
- [Inspiration](#inspiration)
- [Support](#support)

---

## Why SMSPit?

Testing SMS integrations usually requires:

- Real phone numbers
- Paid SMS providers
- Network connectivity
- Provider credentials
- Manual verification

**SMSPit eliminates all of these.**

Simply point your application to SMSPit instead of a real SMS provider, and every outgoing SMS is captured in a beautiful web dashboard.

No SMS is actually delivered.

---

## Planned Features

None of these are implemented yet — see the [Roadmap](#roadmap) for what's targeted in each release.

- 📩 Capture outgoing SMS
- 🔍 Powerful search and filtering
- ⚡ Real-time dashboard
- 🔄 Replay SMS requests
- 📱 OTP detection
- 📦 REST API
- 🔑 API Key authentication
- 📊 Delivery statistics
- 📁 Export messages
- 🧪 CI/CD friendly
- 🐳 Docker support
- 🌐 Multi-tenant ready
- 📡 WebSocket live updates
- 📜 Request history
- 🔥 Provider emulation
- ⚙️ OpenAPI documentation

---

# Screenshots

Mockup of the planned dashboard (not a real screenshot yet):

```
Inbox

+---------------------------------------------------------------+
| To           Message                    Time        Status     |
+---------------------------------------------------------------+
| +88017...    Your OTP is 492184         09:24 PM    Captured   |
| +88018...    Welcome to SMSPit          09:22 PM    Captured   |
| +88019...    Payment Successful         09:21 PM    Captured   |
+---------------------------------------------------------------+
```

---

# Architecture

```
                   +----------------------+
                   |    API Gateway (Go)  |
                   +----------+-----------+
                              |
          +-------------------+-------------------+
          |                   |                   |
          |                   |                   |
+---------v------+   +--------v-------+   +-------v-------+
| Auth Service   |   | SMS Service    |   | AI Service    |
| Laravel        |   | Node.js        |   | Python        |
+----------------+   +----------------+   +---------------+
                              |
                       Redis / NATS / Kafka
                              |
                    +---------v----------+
                    | Worker Service (Go)|
                    +---------+----------+
                              |
                        PostgreSQL
                              |
                    +---------v----------+
                    |  React Dashboard   |
                    +--------------------+
```

---

# Tech Stack

| Component | Technology |
|------------|------------|
| API Gateway | Go |
| Authentication | Laravel |
| SMS Service | NestJS |
| AI Service | FastAPI |
| Queue | Redis / NATS / Kafka |
| Database | PostgreSQL |
| Cache | Redis |
| Dashboard | React |
| Container | Docker |
| Monitoring | Prometheus + Grafana |
| Tracing | OpenTelemetry |

---

# Project Structure

Service folders and shared directories are already scaffolded; internal service code (marked below) is still planned per [checklist.md](checklist.md).

```
SMSPit/
├── gateway/                       # API Gateway (Go)
│   ├── cmd/
│   │   └── gateway/
│   │       └── main.go
│   ├── internal/
│   │   ├── router/
│   │   ├── middleware/
│   │   └── proxy/
│   ├── config/
│   ├── Dockerfile
│   └── go.mod
│
├── auth-service/                  # Authentication & API Keys (Laravel)
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Services/
│   ├── routes/
│   ├── database/migrations/
│   ├── tests/
│   ├── Dockerfile
│   └── composer.json
│
├── sms-service/                   # SMS Capture & Replay (NestJS)
│   ├── src/
│   │   ├── messages/
│   │   ├── websocket/
│   │   ├── providers/
│   │   └── main.ts
│   ├── test/
│   ├── Dockerfile
│   └── package.json
│
├── ai-service/                    # OTP/Spam Detection, Classification (FastAPI)
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── worker/                        # Background Jobs / Queue Consumers (Go)
│   ├── cmd/
│   │   └── worker/
│   │       └── main.go
│   ├── internal/
│   │   ├── consumer/
│   │   └── jobs/
│   ├── Dockerfile
│   └── go.mod
│
├── dashboard/                     # Web Dashboard (React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── App.tsx
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── proto/                         # Shared gRPC/protobuf definitions
│   └── sms/v1/
│
├── docs/                          # Documentation & diagrams
│   ├── images/
│   ├── api/
│   └── architecture.md
│
├── docker/                        # Shared Dockerfiles / compose fragments
│   └── base/
│
├── deployments/                   # Kubernetes, Helm charts, environment configs
│   ├── k8s/
│   └── helm/
│
├── scripts/                       # Dev & CI helper scripts (planned)
│   ├── setup.sh
│   └── migrate.sh
│
├── docker-compose.yml             # wires gateway + auth-service + sms-service + dashboard + Postgres + Redis (v0.2)
├── checklist.md                   # 100-day build checklist
├── CLAUDE.md                      # AI agent working guide
├── LICENSE
└── README.md
```

---

# Quick Start

v0.2 ships `gateway`, `auth-service`, `sms-service`, and `dashboard`; the workflow below covers all four. `docker compose up -d` itself hasn't been run/verified in this environment (no Docker available during development) — see [CHANGELOG.md](CHANGELOG.md#known-gaps).

All API requests now require an API key: generate one via `POST /api/api-keys` on `auth-service` (or the dashboard's own `/api-keys` page, which needs no key itself to get in) and pass it as `Authorization: Bearer <key>` against the gateway.

## Clone

```bash
git clone https://github.com/jmrashed/SMSPit.git

cd SMSPit
```

## Start

```bash
docker compose up -d
```

Open

```
Dashboard

http://localhost:5173
```

API

```
http://localhost:8080
```

---

# Example (Planned Usage)

The idea: point your app at SMSPit instead of your real SMS provider. No code change beyond configuration — every message gets captured, not delivered.

## Before — sending via your SMS provider's SDK

```php
$provider = new SmsClient($apiKey);

$provider->messages->send(
    "+8801700000000",
    [
        "from" => "SMSPit",
        "body" => "Your OTP is 845231",
    ]
);
```

## After — pointing at SMSPit

Swap your provider's base URL for your local SMSPit instance (works out of the box if your SDK lets you override the base URL, or via a [compatible adapter](#provider-compatibility) for providers SMSPit emulates):

```php
$provider = new SmsClient($apiKey, [
    "baseUri" => "http://localhost:8080",
]);
```

Or call the native SMSPit REST API directly from any language:

```bash
curl -X POST http://localhost:8080/api/v1/messages \
  -H "Authorization: Bearer $SMSPIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "to": "+8801700000000",
        "from": "SMSPit",
        "message": "Your OTP is 845231"
      }'
```

```json
{
  "id": "sms_123456",
  "status": "captured"
}
```

The message appears instantly in the dashboard — no network call leaves your machine, and no real SMS is sent.

---

# REST API

Every endpoint below requires `Authorization: Bearer <api key>` as of v0.2, validated against `auth-service` (at the gateway, and again at `sms-service` itself for defense in depth).

## Send SMS

```http
POST /api/v1/messages
```

```json
{
  "to": "+8801700000000",
  "from": "SMSPit",
  "message": "Your OTP is 845231"
}
```

Response

```json
{
  "id":"sms_123456",
  "status":"captured"
}
```

---

## List Messages

```
GET /api/v1/messages
```

---

## Message Details

```
GET /api/v1/messages/{id}
```

---

## Delete Messages

```
DELETE /api/v1/messages
```

---

## Replay

```
POST /api/v1/messages/{id}/replay
```

---

## Statistics

```
GET /api/v1/statistics
```

---

# Dashboard Features

- Inbox
- Search
- Filters
- Raw Request
- Headers
- Replay
- Export
- API Logs
- Timeline
- WebSocket Updates

---

# Provider Compatibility

SMSPit aims to support compatible endpoints for popular SMS providers.

Planned integrations include:

- Vonage
- AWS SNS
- MessageBird
- Infobip
- Plivo
- Clickatell

This allows existing applications to switch to SMSPit with minimal configuration changes.

---

# Roadmap

## v0.1 — shipped

- SMS Capture
- Dashboard
- Search
- REST API
- Docker

---

## v0.2 — shipped

- Authentication
- API Keys
- Replay
- Statistics
- WebSocket

---

## v0.3

- Provider Emulation
- Teams
- Organizations
- Message Templates
- Export

---

## v0.4

- AI OTP Detection
- AI Classification
- AI Spam Detection
- AI Test Data Generator

---

## v1.0

- Kubernetes
- Helm
- OpenTelemetry
- Prometheus
- Grafana
- Multi-tenancy
- SDKs

---

# SDKs (Planned)

- PHP
- Go
- Node.js
- Python
- Java
- .NET

---

# Contributing

Contributions are welcome, especially at this early planning stage!

1. Fork the repository
2. Check [checklist.md](checklist.md) to see what's next in the build order
3. Create a feature branch
4. Commit your changes
5. Open a Pull Request

Formal contribution guidelines will be added as the project takes shape. In the meantime, [checklist.md](checklist.md) is the source of truth for build order and [CLAUDE.md](CLAUDE.md) documents the working conventions used in this repo.

---

# License

Released under the MIT License.

---

# Inspiration

SMSPit is inspired by developer tools that make local development faster and more enjoyable, such as:

- Mailpit
- MailHog
- MockServer
- WireMock
- LocalStack

---

# Support

If you find SMSPit useful, please consider:

⭐ Star the repository

🐛 Report bugs

💡 Suggest new features

🤝 Contribute to the project

---

<p align="center">
Made with ❤️ for developers.
</p>
