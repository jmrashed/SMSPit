<?php

namespace App\Support;

use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\API\Trace\NoopTracer;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Common\Export\Http\PsrTransportFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SemConv\ResourceAttributes;

/**
 * OpenTelemetry tracing bootstrap (Day 83). Same non-blocking-by-default
 * philosophy as the other services' optional integrations -- unset
 * OTEL_EXPORTER_OTLP_ENDPOINT means tracing is simply never configured,
 * not a startup failure (Telemetry::tracer() returns a no-op tracer).
 *
 * Uses SimpleSpanProcessor (synchronous export at span end) rather than
 * a batch processor: classic php-fpm has no background thread to flush a
 * batch on, and a span queued but never flushed before the process
 * recycles is a silently dropped trace.
 */
class Telemetry
{
    private static ?TracerInterface $tracer = null;

    public static function tracer(): TracerInterface
    {
        if (self::$tracer !== null) {
            return self::$tracer;
        }

        $endpoint = env('OTEL_EXPORTER_OTLP_ENDPOINT');
        if (! $endpoint) {
            return self::$tracer = new NoopTracer();
        }

        $transport = (new PsrTransportFactory())->create("{$endpoint}/v1/traces", 'application/x-protobuf');
        $exporter = new SpanExporter($transport);

        $resource = ResourceInfoFactory::defaultResource()->merge(ResourceInfo::create(
            Attributes::create([ResourceAttributes::SERVICE_NAME => 'auth-service'])
        ));

        $provider = TracerProvider::builder()
            ->addSpanProcessor(new SimpleSpanProcessor($exporter))
            ->setResource($resource)
            ->build();

        return self::$tracer = $provider->getTracer('auth-service');
    }
}
