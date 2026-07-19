<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ValidateApiKeyMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function createKey(array $forceFillOverrides = []): array
    {
        $user = User::factory()->create();
        $secret = 'plaintext-secret';

        $apiKey = ApiKey::create([
            'name' => 'Test key',
            'key' => 'sms_live_test1234',
            'secret_hash' => Hash::make($secret),
            'owner_id' => $user->id,
            'scopes' => ['messages:read'],
        ]);

        if ($forceFillOverrides !== []) {
            $apiKey->forceFill($forceFillOverrides)->save();
        }

        return [$apiKey, "{$apiKey->key}.{$secret}"];
    }

    public function test_rejects_a_request_with_no_authorization_header(): void
    {
        $response = $this->getJson('/api/api-keys/validate');

        $response->assertStatus(401);
        $response->assertJsonPath('code', 'UNAUTHORIZED');
    }

    public function test_rejects_a_malformed_token(): void
    {
        $response = $this->getJson('/api/api-keys/validate', [
            'Authorization' => 'Bearer not-a-valid-token',
        ]);

        $response->assertStatus(401);
    }

    public function test_rejects_a_wrong_secret(): void
    {
        [$apiKey] = $this->createKey();

        $response = $this->getJson('/api/api-keys/validate', [
            'Authorization' => "Bearer {$apiKey->key}.wrong-secret",
        ]);

        $response->assertStatus(401);
    }

    public function test_rejects_a_revoked_key(): void
    {
        [, $token] = $this->createKey(['revoked_at' => now()]);

        $response = $this->getJson('/api/api-keys/validate', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(401);
    }

    public function test_accepts_a_valid_key_and_updates_last_used_at(): void
    {
        [$apiKey, $token] = $this->createKey();
        $this->assertNull($apiKey->last_used_at);

        $response = $this->getJson('/api/api-keys/validate', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('id', $apiKey->id);
        $response->assertJsonPath('scopes', ['messages:read']);

        $this->assertNotNull($apiKey->fresh()->last_used_at);
    }
}
