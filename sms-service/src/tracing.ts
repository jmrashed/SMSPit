// Must be imported before any other module (see main.ts) -- OpenTelemetry's
// auto-instrumentation works by monkey-patching modules (http, express) at
// require() time, which only catches requires that happen after this runs.
// That also means it runs before AppModule's ConfigModule.forRoot() has
// loaded .env, so .env needs loading here too, redundantly.
import { config as loadEnv } from 'dotenv';
loadEnv();

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Same non-blocking-by-default philosophy as this service's other optional
// integrations (AiClient, QueuePublisher) -- no endpoint configured means
// tracing is simply never started, not a startup failure.
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (otlpEndpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'sms-service' }),
    traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
    // UndiciInstrumentation covers Node's native fetch() (built on
    // undici) -- AuthClient/AiClient/QueuePublisher's outgoing calls use
    // fetch, not the legacy http/https modules HttpInstrumentation patches.
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new UndiciInstrumentation(),
    ],
  });

  sdk.start();
  console.log(`telemetry: exporting traces for "sms-service" to ${otlpEndpoint}`);

  process.on('SIGTERM', () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
} else {
  console.log('telemetry: OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled');
}
