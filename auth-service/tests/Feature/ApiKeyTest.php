<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ApiKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_a_key_and_returns_the_plaintext_secret_once(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/api-keys', [
            'name' => 'CI pipeline',
            'owner_id' => $user->id,
            'scopes' => ['messages:read'],
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['id', 'name', 'key', 'scopes', 'created_at']);
        $response->assertJsonPath('name', 'CI pipeline');
        $response->assertJsonPath('scopes', ['messages:read']);

        // Plaintext key is "{lookup key}.{secret}" -- never stored as-is.
        [$lookupKey, $secret] = explode('.', $response->json('key'));

        $apiKey = ApiKey::where('key', $lookupKey)->first();
        $this->assertNotNull($apiKey);
        $this->assertSame($user->id, $apiKey->owner_id);
        $this->assertTrue(Hash::check($secret, $apiKey->secret_hash));
        $this->assertArrayNotHasKey('secret_hash', $response->json());
    }

    public function test_rejects_a_request_missing_required_fields(): void
    {
        $response = $this->postJson('/api/api-keys', []);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['code', 'message', 'details']);
    }

    public function test_rejects_an_owner_id_that_does_not_exist(): void
    {
        $response = $this->postJson('/api/api-keys', [
            'name' => 'Orphan key',
            'owner_id' => 999999,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
    }

    public function test_defaults_scopes_to_an_empty_array_when_omitted(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/api-keys', [
            'name' => 'No scopes',
            'owner_id' => $user->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('scopes', []);
    }

    public function test_generates_unique_keys_and_secrets_across_multiple_requests(): void
    {
        $user = User::factory()->create();

        $first = $this->postJson('/api/api-keys', ['name' => 'a', 'owner_id' => $user->id])->json('key');
        $second = $this->postJson('/api/api-keys', ['name' => 'b', 'owner_id' => $user->id])->json('key');

        $this->assertNotSame($first, $second);
        $this->assertSame(2, ApiKey::count());
    }
}
