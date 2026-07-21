from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.telemetry import setup_tracing


def test_setup_tracing_is_a_noop_without_an_endpoint():
    app = FastAPI()

    setup_tracing(app, None)

    # No instrumentation applied -- the app still works normally.
    @app.get("/ping")
    def ping():
        return {"ok": True}

    assert TestClient(app).get("/ping").json() == {"ok": True}


def test_setup_tracing_instruments_the_app_when_an_endpoint_is_configured():
    app = FastAPI()

    # Doesn't exercise a real request here -- FastAPIInstrumentor would
    # generate a real span that a background thread then retries
    # exporting to the (nonexistent) endpoint, which is noisy without
    # adding coverage: the interesting behavior is that instrumenting
    # doesn't raise, and that it marks the app as instrumented.
    setup_tracing(app, "http://localhost:4318")

    assert app._is_instrumented_by_opentelemetry is True
