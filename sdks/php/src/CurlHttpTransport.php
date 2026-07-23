<?php

declare(strict_types=1);

namespace SMSPit;

/**
 * Default HttpTransport, built on ext-curl so the SDK has no third-party
 * HTTP client dependency (Guzzle etc.) to pull into a consumer's project.
 */
final class CurlHttpTransport implements HttpTransport
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly int $timeoutSeconds = 10,
    ) {
    }

    public function request(string $method, string $path, ?array $body = null, array $query = []): array
    {
        $url = rtrim($this->baseUrl, '/').$path;
        if ($query !== []) {
            $url .= '?'.http_build_query($query);
        }

        $ch = curl_init($url);
        $headers = [
            'Authorization: Bearer '.$this->apiKey,
            'Accept: application/json',
        ];

        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
        ];

        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_POSTFIELDS] = json_encode($body, JSON_THROW_ON_ERROR);
        }

        $options[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $options);

        $response = curl_exec($ch);
        if ($response === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new TransportException("Request to {$url} failed: {$error}");
        }

        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $decoded = $response === '' ? [] : json_decode($response, true);
        if (!is_array($decoded)) {
            throw new TransportException("Request to {$url} returned a non-JSON body: {$response}");
        }

        return ['status' => $status, 'body' => $decoded];
    }
}
