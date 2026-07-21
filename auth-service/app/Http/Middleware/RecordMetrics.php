<?php

namespace App\Http\Middleware;

use App\Support\Metrics;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records request count/duration for every request (Day 84).
 */
class RecordMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $route = $request->route()?->uri() ?? 'unmatched';
        $duration = microtime(true) - $start;

        $registry = Metrics::registry();

        $registry->getOrRegisterCounter(
            'auth_service',
            'http_requests_total',
            'Total HTTP requests handled by auth-service.',
            ['method', 'route', 'status']
        )->inc([$request->method(), $route, (string) $response->getStatusCode()]);

        $registry->getOrRegisterHistogram(
            'auth_service',
            'http_request_duration_seconds',
            'HTTP request duration in seconds.',
            ['method', 'route']
        )->observe($duration, [$request->method(), $route]);

        return $response;
    }
}
