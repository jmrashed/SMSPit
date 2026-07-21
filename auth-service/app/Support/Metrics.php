<?php

namespace App\Support;

use Prometheus\CollectorRegistry;
use Prometheus\RenderTextFormat;
use Prometheus\Storage\Redis;

/**
 * Prometheus metrics (Day 84), in addition to the OpenTelemetry tracing
 * added Day 83 -- separate systems, both useful, neither replacing the
 * other.
 *
 * Backed by Redis (already part of this stack, see docs/redis.md)
 * rather than in-memory storage: classic php-fpm spawns multiple
 * worker processes, each with its own memory, so an in-memory counter
 * would only ever reflect whichever worker happened to handle the
 * /metrics scrape, not the sum across all of them.
 */
class Metrics
{
    private static ?CollectorRegistry $registry = null;

    public static function registry(): CollectorRegistry
    {
        if (self::$registry !== null) {
            return self::$registry;
        }

        $storage = new Redis([
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => (int) env('REDIS_PORT', 6379),
        ]);

        return self::$registry = new CollectorRegistry($storage);
    }

    public static function render(): string
    {
        return (new RenderTextFormat())->render(self::registry()->getMetricFamilySamples());
    }
}
