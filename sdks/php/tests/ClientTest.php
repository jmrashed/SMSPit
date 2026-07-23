<?php

declare(strict_types=1);

namespace SMSPit\Tests;

use PHPUnit\Framework\TestCase;
use SMSPit\ApiException;
use SMSPit\Client;

final class ClientTest extends TestCase
{
    private const MESSAGE = [
        'id' => 'sms_abc123',
        'to' => '+8801700000000',
        'from' => 'SMSPit',
        'message' => 'Your OTP is 123456',
        'status' => 'captured',
        'otp' => '123456',
        'category' => 'otp',
        'is_spam' => false,
        'replayed_from' => null,
        'org_id' => null,
        'created_at' => '2026-07-24T00:00:00.000Z',
    ];

    public function test_send_posts_the_payload_and_returns_a_message(): void
    {
        $transport = new FakeHttpTransport(['status' => 201, 'body' => self::MESSAGE]);
        $client = new Client('http://localhost:8080', 'sms_live_x.y', $transport);

        $message = $client->send('+8801700000000', 'SMSPit', 'Your OTP is 123456');

        self::assertSame('sms_abc123', $message->id);
        self::assertSame('123456', $message->otp);
        self::assertSame('POST', $transport->lastRequest['method']);
        self::assertSame('/api/v1/messages', $transport->lastRequest['path']);
        self::assertSame([
            'to' => '+8801700000000',
            'from' => 'SMSPit',
            'message' => 'Your OTP is 123456',
        ], $transport->lastRequest['body']);
    }

    public function test_list_passes_filters_as_query_params_and_maps_each_message(): void
    {
        $transport = new FakeHttpTransport([
            'status' => 200,
            'body' => ['messages' => [self::MESSAGE], 'total' => 1, 'limit' => 20, 'offset' => 0],
        ]);
        $client = new Client('http://localhost:8080', 'sms_live_x.y', $transport);

        $result = $client->list(['to' => '+8801700000000', 'limit' => 20]);

        self::assertSame('GET', $transport->lastRequest['method']);
        self::assertSame(['to' => '+8801700000000', 'limit' => 20], $transport->lastRequest['query']);
        self::assertCount(1, $result['messages']);
        self::assertSame('sms_abc123', $result['messages'][0]->id);
        self::assertSame(1, $result['total']);
    }

    public function test_get_fetches_a_single_message_by_id(): void
    {
        $transport = new FakeHttpTransport(['status' => 200, 'body' => self::MESSAGE]);
        $client = new Client('http://localhost:8080', 'sms_live_x.y', $transport);

        $message = $client->get('sms_abc123');

        self::assertSame('/api/v1/messages/sms_abc123', $transport->lastRequest['path']);
        self::assertSame('sms_abc123', $message->id);
    }

    public function test_replay_posts_to_the_replay_endpoint(): void
    {
        $replayed = array_merge(self::MESSAGE, ['id' => 'sms_def456', 'replayed_from' => 'sms_abc123']);
        $transport = new FakeHttpTransport(['status' => 201, 'body' => $replayed]);
        $client = new Client('http://localhost:8080', 'sms_live_x.y', $transport);

        $message = $client->replay('sms_abc123');

        self::assertSame('POST', $transport->lastRequest['method']);
        self::assertSame('/api/v1/messages/sms_abc123/replay', $transport->lastRequest['path']);
        self::assertSame('sms_abc123', $message->replayedFrom);
    }

    public function test_error_responses_are_raised_as_api_exceptions(): void
    {
        $transport = new FakeHttpTransport([
            'status' => 404,
            'body' => ['code' => 'NOT_FOUND', 'message' => 'Message not found', 'details' => null],
        ]);
        $client = new Client('http://localhost:8080', 'sms_live_x.y', $transport);

        try {
            $client->get('sms_missing');
            self::fail('Expected an ApiException to be thrown');
        } catch (ApiException $e) {
            self::assertSame(404, $e->status);
            self::assertSame('NOT_FOUND', $e->errorCode);
            self::assertSame('Message not found', $e->getMessage());
        }
    }
}
