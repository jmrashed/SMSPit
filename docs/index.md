---
layout: home

hero:
  name: SMSPit
  text: The Sandbox for SMS
  tagline: A self-hosted SMS sandbox for local development, testing, and CI/CD — capture, inspect, search, replay, and debug SMS messages without sending real SMS to mobile networks.
  image:
    src: /assets/logo.svg
    alt: SMSPit
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Architecture
      link: /architecture
    - theme: alt
      text: API Reference
      link: /openapi/site/index.html
    - theme: alt
      text: View on GitHub
      link: https://github.com/jmrashed/SMSPit

features:
  - title: Capture, don't deliver
    details: Point your app at SMSPit instead of a real SMS provider. Every outgoing message is captured, searchable, and replayable — never actually sent.
    link: /faq#what-is-the-difference-between-capture-and-delivery
  - title: Provider-compatible
    details: Drop-in endpoints for MessageBird, Vonage, and AWS SNS — swap the base URL your existing SDK already uses, no code changes.
    link: /api/provider-compatibility
  - title: AI-powered
    details: Automatic OTP detection, message classification, and spam scoring on every captured message, with a manual override when it's wrong.
    link: /ai-service
  - title: Multi-tenant
    details: Organizations, teams, and per-org rate limiting — API keys are scoped so tenants never see each other's data.
    link: /multi-tenancy
  - title: Production-ready
    details: Kubernetes manifests, a Helm chart, OpenTelemetry tracing, Prometheus metrics, and Grafana dashboards, all included.
    link: /production-deployment
  - title: Native SDKs
    details: PHP, Go, Node.js, and Python clients with no third-party HTTP dependency, each verified against a live instance.
    link: /sdks
---

## Where to go next

New to SMSPit? Start with **[Getting Started](getting-started.md)** for a guided first run, or jump straight to a topic:

| I want to... | Go to |
|---|---|
| Run SMSPit locally, step by step | [Getting Started](getting-started.md) |
| Look up every endpoint and field | [OpenAPI Reference](openapi/site/index.html) |
| Understand how the services fit together | [Architecture](architecture.md) |
| Use a native client instead of raw HTTP | [SDKs](sdks.md) |
| Deploy to production (Compose or Kubernetes) | [Production Deployment](production-deployment.md) |
| Understand the security/auth model | [Security](security.md) |
| See what changed release to release | [Changelog](changelog.md) |
| Fix a problem | [Troubleshooting](troubleshooting.md) |

