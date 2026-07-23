<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

use SMSPit\Client;

// Point at the gateway (or sms-service directly); use an API key from
// `POST /api-keys` on auth-service (see docs/local-dev-setup.md).
$client = new Client(
    baseUrl: getenv('SMSPIT_BASE_URL') ?: 'http://localhost:8080',
    apiKey: getenv('SMSPIT_API_KEY') ?: throw new RuntimeException('Set SMSPIT_API_KEY'),
);

$message = $client->send(to: '+8801700000000', from: 'SMSPit', message: 'Your OTP is 123456');
echo "Captured {$message->id} (otp: {$message->otp})\n";

$replay = $client->replay($message->id);
echo "Replayed as {$replay->id}\n";

$page = $client->list(['limit' => 5]);
echo "Inbox has {$page['total']} message(s) total, showing {$page['limit']}:\n";
foreach ($page['messages'] as $inboxMessage) {
    echo "  - {$inboxMessage->id}: {$inboxMessage->from} -> {$inboxMessage->to}: {$inboxMessage->message}\n";
}
