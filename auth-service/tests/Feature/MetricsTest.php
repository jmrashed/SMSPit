<?php

namespace Tests\Feature;

use Tests\TestCase;

class MetricsTest extends TestCase
{
    public function test_metrics_endpoint_exposes_prometheus_format(): void
    {
        // Generate at least one request so auth_service_http_requests_total
        // has a sample -- an empty registry would still return 200, but
        // wouldn't prove the counter is actually wired up.
        $this->get('/up');

        $response = $this->get('/metrics');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        $response->assertSee('auth_service_http_requests_total', false);
        $response->assertSee('auth_service_http_request_duration_seconds', false);
    }
}
