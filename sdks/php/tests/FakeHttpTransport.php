<?php

declare(strict_types=1);

namespace SMSPit\Tests;

use SMSPit\HttpTransport;

/** Records the last request made and returns a canned response, so Client can be tested without a real server. */
final class FakeHttpTransport implements HttpTransport
{
    /** @var array{method: string, path: string, body: ?array, query: array}|null */
    public ?array $lastRequest = null;

    /** @param array{status: int, body: array<string, mixed>} $response */
    public function __construct(private array $response)
    {
    }

    public function request(string $method, string $path, ?array $body = null, array $query = []): array
    {
        $this->lastRequest = ['method' => $method, 'path' => $path, 'body' => $body, 'query' => $query];

        return $this->response;
    }
}
