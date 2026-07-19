<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Organization;
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

    public function test_lists_keys_newest_first_without_exposing_the_secret_hash(): void
    {
        $user = User::factory()->create();
        $older = ApiKey::factory()->for($user, 'owner')->create(['created_at' => now()->subDay()]);
        $newer = ApiKey::factory()->for($user, 'owner')->create(['created_at' => now()]);

        $response = $this->getJson('/api/api-keys');

        $response->assertStatus(200);
        $response->assertJsonPath('api_keys.0.id', $newer->id);
        $response->assertJsonPath('api_keys.1.id', $older->id);
        $response->assertJsonStructure([
            'api_keys' => [['id', 'name', 'key', 'owner_id', 'scopes', 'last_used_at', 'revoked_at', 'created_at']],
        ]);
        $this->assertArrayNotHasKey('secret_hash', $response->json('api_keys.0'));
    }

    public function test_revokes_a_key(): void
    {
        $user = User::factory()->create();
        $apiKey = ApiKey::factory()->for($user, 'owner')->create();

        $response = $this->deleteJson("/api/api-keys/{$apiKey->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('id', $apiKey->id);
        $this->assertNotNull($response->json('revoked_at'));
        $this->assertNotNull($apiKey->fresh()->revoked_at);
    }

    public function test_revoking_an_already_revoked_key_is_idempotent(): void
    {
        $user = User::factory()->create();
        $apiKey = ApiKey::factory()->for($user, 'owner')->create(['revoked_at' => now()->subHour()]);
        $originalRevokedAt = $apiKey->revoked_at;

        $response = $this->deleteJson("/api/api-keys/{$apiKey->id}");

        $response->assertStatus(200);
        $this->assertTrue($apiKey->fresh()->revoked_at->equalTo($originalRevokedAt));
    }

    public function test_revoking_an_unknown_key_returns_404(): void
    {
        $response = $this->deleteJson('/api/api-keys/999999');

        $response->assertStatus(404);
    }

    public function test_a_revoked_key_fails_validation(): void
    {
        $user = User::factory()->create();
        $secret = 'plaintext-secret';
        $apiKey = ApiKey::factory()->for($user, 'owner')->create(['secret_hash' => Hash::make($secret)]);

        $this->deleteJson("/api/api-keys/{$apiKey->id}")->assertStatus(200);

        $response = $this->getJson('/api/api-keys/validate', [
            'Authorization' => "Bearer {$apiKey->key}.{$secret}",
        ]);

        $response->assertStatus(401);
    }

    public function test_generates_an_org_scoped_key_when_the_owner_is_a_member(): void
    {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'member']);

        $response = $this->postJson('/api/api-keys', [
            'name' => 'Org key',
            'owner_id' => $user->id,
            'org_id' => $organization->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('org_id', $organization->id);
    }

    public function test_rejects_an_org_id_the_owner_is_not_a_member_of(): void
    {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();

        $response = $this->postJson('/api/api-keys', [
            'name' => 'Org key',
            'owner_id' => $user->id,
            'org_id' => $organization->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
    }

    public function test_validate_returns_the_keys_org_id(): void
    {
        $user = User::factory()->create();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'member']);
        $secret = 'plaintext-secret';
        $apiKey = ApiKey::factory()->for($user, 'owner')->create([
            'org_id' => $organization->id,
            'secret_hash' => Hash::make($secret),
        ]);

        $response = $this->getJson('/api/api-keys/validate', [
            'Authorization' => "Bearer {$apiKey->key}.{$secret}",
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('org_id', $organization->id);
    }
}
