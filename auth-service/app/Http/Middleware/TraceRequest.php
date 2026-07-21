<?php

namespace App\Http\Middleware;

use App\Support\Telemetry;
use Closure;
use Illuminate\Http\Request;
use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\StatusCode;
use Symfony\Component\HttpFoundation\Response;

/**
 * Starts a span per request (Day 83), continuing the caller's trace if a
 * W3C traceparent header is present -- this is what makes a trace
 * continuous from gateway/sms-service into auth-service.
 */
class TraceRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $parentContext = TraceContextPropagator::getInstance()->extract([
            'traceparent' => $request->header('traceparent'),
        ]);

        $span = Telemetry::tracer()
            ->spanBuilder($request->method().' '.$request->path())
            ->setParent($parentContext)
            ->setSpanKind(SpanKind::KIND_SERVER)
            ->setAttribute('http.method', $request->method())
            ->setAttribute('http.target', $request->path())
            ->startSpan();

        $scope = $span->activate();

        try {
            $response = $next($request);
            $span->setAttribute('http.status_code', $response->getStatusCode());
            if ($response->getStatusCode() >= 500) {
                $span->setStatus(StatusCode::STATUS_ERROR);
            }

            return $response;
        } finally {
            $scope->detach();
            $span->end();
        }
    }
}
