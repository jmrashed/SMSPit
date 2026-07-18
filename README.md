# SMSPit

> **The Mailpit for SMS.**
>
> A modern, self-hosted SMS sandbox for local development, testing, and CI/CD. Capture, inspect, search, replay, and debug SMS messages without sending real SMS to mobile networks.

<p align="center">
  <img src="docs/images/logo.png" alt="SMSPit Logo" width="180">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/your-org/smspit" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/github/actions/workflow/status/your-org/smspit/ci.yml?branch=main" alt="Build"></a>
  <a href="#"><img src="https://img.shields.io/docker/pulls/your-org/smspit" alt="Docker"></a>
  <a href="#"><img src="https://img.shields.io/github/stars/your-org/smspit" alt="Stars"></a>
  <a href="#"><img src="https://img.shields.io/github/issues/your-org/smspit" alt="Issues"></a>
</p>

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

## Features

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

Coming soon.

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

```
smspit/

├── gateway/
├── auth-service/
├── sms-service/
├── ai-service/
├── worker/
├── dashboard/
├── docs/
├── docker/
├── deployments/
├── proto/
├── scripts/
├── docker-compose.yml
└── README.md
```

---

# Quick Start

## Clone

```bash
git clone https://github.com/your-org/smspit.git

cd smspit
```

## Start

```bash
docker compose up -d
```

Open

```
Dashboard

http://localhost:8025
```

API

```
http://localhost:8080
```

---

# Example

Instead of

```php
Twilio::send(...)
```

Configure

```
http://localhost:8080/api/v1/messages
```

Every SMS will appear instantly in the dashboard.

---

# REST API

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

- Twilio
- Vonage
- AWS SNS
- MessageBird
- Infobip
- Plivo
- Clickatell

This allows existing applications to switch to SMSPit with minimal configuration changes.

---

# Roadmap

## v0.1

- SMS Capture
- Dashboard
- Search
- REST API
- Docker

---

## v0.2

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

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

Please read the contribution guidelines before submitting your PR.

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
