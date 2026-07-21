// Package telemetry wires up OpenTelemetry tracing (Day 83), exported via
// OTLP/HTTP to a collector (e.g. Jaeger's all-in-one, see docker-compose.yml).
package telemetry

import (
	"context"
	"log"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// Init configures the global TracerProvider and W3C trace-context
// propagator. If endpoint is empty, tracing is a no-op -- same
// non-blocking-by-default philosophy as this worker's other optional
// integrations (ai-service, Redis).
func Init(ctx context.Context, serviceName, endpoint string) (shutdown func(context.Context) error, err error) {
	otel.SetTextMapPropagator(propagation.TraceContext{})

	if endpoint == "" {
		log.Printf("telemetry: OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled")
		return func(context.Context) error { return nil }, nil
	}

	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(endpoint),
		otlptracehttp.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	res, err := resource.Merge(resource.Default(), resource.NewSchemaless(
		semconv.ServiceName(serviceName),
	))
	if err != nil {
		return nil, err
	}

	provider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(provider)

	log.Printf("telemetry: exporting traces for %q to %s", serviceName, endpoint)
	return provider.Shutdown, nil
}
