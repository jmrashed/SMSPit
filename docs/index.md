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
      link: /local-dev-setup
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
  - title: Provider-compatible
    details: Drop-in endpoints for MessageBird, Vonage, and AWS SNS — swap the base URL your existing SDK already uses, no code changes.
  - title: AI-powered
    details: Automatic OTP detection, message classification, and spam scoring on every captured message, with a manual override when it's wrong.
  - title: Multi-tenant
    details: Organizations, teams, and per-org rate limiting — API keys are scoped so tenants never see each other's data.
  - title: Production-ready
    details: Kubernetes manifests, a Helm chart, OpenTelemetry tracing, Prometheus metrics, and Grafana dashboards, all included.
  - title: Native SDKs
    details: PHP, Go, Node.js, and Python clients with no third-party HTTP dependency, each verified against a live instance.
---
