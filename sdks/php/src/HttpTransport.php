<?php

declare(strict_types=1);

namespace SMSPit;

/**
 * Abstracts the actual HTTP call so Client can be unit-tested without a
 * real server (see CurlHttpTransport for the default implementation).
 */
interface HttpTransport
{
    /**
     * @param array<string, mixed>|null $body
     * @param array<string, mixed> $query
     * @return array{status: int, body: array<string, mixed>}
     */
    public function request(string $method, string $path, ?array $body = null, array $query = []): array;
}
