import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// Prometheus metrics (Day 84), in addition to the OpenTelemetry tracing
// added Day 83 -- separate systems (metrics vs. traces), both useful,
// neither replacing the other.
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'sms_service_http_requests_total',
    help: 'Total HTTP requests handled by sms-service.',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'sms_service_http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames: ['method', 'route'] as const,
    registers: [this.registry],
  });

  // Feeds the Grafana "message volume / OTP detection rate" panel (Day 85).
  readonly messagesCapturedTotal = new Counter({
    name: 'sms_service_messages_captured_total',
    help: 'Total messages captured, by classification category.',
    labelNames: ['category'] as const,
    registers: [this.registry],
  });

  readonly otpDetectedTotal = new Counter({
    name: 'sms_service_otp_detected_total',
    help: 'Total captured messages an OTP was detected in.',
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}
