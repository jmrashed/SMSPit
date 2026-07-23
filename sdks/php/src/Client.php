<?php

declare(strict_types=1);

namespace SMSPit;

/**
 * Client for SMSPit's native REST API (docs/api/message-mapping.md).
 * Point base_url at the gateway (or sms-service directly) and pass the
 * full "{key}.{secret}" API key auth-service issued.
 */
final class Client
{
    private HttpTransport $transport;

    public function __construct(string $baseUrl, string $apiKey, ?HttpTransport $transport = null)
    {
        $this->transport = $transport ?? new CurlHttpTransport($baseUrl, $apiKey);
    }

    /** POST /api/v1/messages */
    public function send(string $to, string $from, string $message): Message
    {
        $result = $this->call('POST', '/api/v1/messages', [
            'to' => $to,
            'from' => $from,
            'message' => $message,
        ]);

        return Message::fromArray($result);
    }

    /**
     * GET /api/v1/messages
     *
     * @param array{limit?: int, offset?: int, to?: string, from?: string, created_after?: string, created_before?: string} $filters
     * @return array{messages: Message[], total: int, limit: int, offset: int}
     */
    public function list(array $filters = []): array
    {
        $result = $this->call('GET', '/api/v1/messages', null, $filters);

        return [
            'messages' => array_map(Message::fromArray(...), $result['messages']),
            'total' => $result['total'],
            'limit' => $result['limit'],
            'offset' => $result['offset'],
        ];
    }

    /** GET /api/v1/messages/{id} */
    public function get(string $id): Message
    {
        return Message::fromArray($this->call('GET', "/api/v1/messages/{$id}"));
    }

    /** POST /api/v1/messages/{id}/replay -- re-sends the original payload as a new, linked message. */
    public function replay(string $id): Message
    {
        return Message::fromArray($this->call('POST', "/api/v1/messages/{$id}/replay"));
    }

    /**
     * @param array<string, mixed>|null $body
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    private function call(string $method, string $path, ?array $body = null, array $query = []): array
    {
        $response = $this->transport->request($method, $path, $body, $query);

        if ($response['status'] >= 400) {
            $error = $response['body'];
            throw new ApiException(
                status: $response['status'],
                errorCode: $error['code'] ?? 'UNKNOWN_ERROR',
                message: $error['message'] ?? 'SMSPit API request failed',
                details: $error['details'] ?? null,
            );
        }

        return $response['body'];
    }
}
