import logging

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logger = logging.getLogger(__name__)


def setup_tracing(app: FastAPI, otlp_endpoint: str | None) -> None:
    """Configures OpenTelemetry tracing (Day 83) and instruments `app`.

    Same non-blocking-by-default philosophy as this service's other
    optional integrations: no endpoint configured means tracing is simply
    never started, not a startup failure.
    """
    if not otlp_endpoint:
        logger.info("telemetry: OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled")
        return

    provider = TracerProvider(resource=Resource.create({SERVICE_NAME: "ai-service"}))
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    logger.info("telemetry: exporting traces for 'ai-service' to %s", otlp_endpoint)
