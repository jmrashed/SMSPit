<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OrganizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: User, 1: string}
     */
    private function actingUser(): array
    {
        $user = User::factory()->create();
        $secret = 'plaintext-secret';
        ApiKey::create([
            'name' => 'test key',
            'key' => 'sms_live_org_test_'.$user->id,
            'secret_hash' => Hash::make($secret),
            'owner_id' => $user->id,
            'scopes' => [],
        ]);

        return [$user, "sms_live_org_test_{$user->id}.{$secret}"];
    }

    private function authHeader(string $token): array
    {
        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_rejects_organization_routes_without_an_api_key(): void
    {
        $this->getJson('/api/organizations')->assertStatus(401);
    }

    public function test_creates_an_organization_and_makes_the_creator_an_admin(): void
    {
        [$user, $token] = $this->actingUser();

        $response = $this->postJson('/api/organizations', ['name' => 'Acme Inc'], $this->authHeader($token));

        $response->assertStatus(201);
        $response->assertJsonPath('name', 'Acme Inc');
        $response->assertJsonPath('slug', 'acme-inc');
        $response->assertJsonPath('role', 'admin');

        $organization = Organization::where('slug', 'acme-inc')->firstOrFail();
        $this->assertTrue($organization->users()->wherePivot('user_id', $user->id)->wherePivot('role', 'admin')->exists());
    }

    public function test_rejects_a_duplicate_slug(): void
    {
        [, $token] = $this->actingUser();
        Organization::factory()->create(['slug' => 'acme-inc']);

        $response = $this->postJson('/api/organizations', ['name' => 'Acme Inc', 'slug' => 'acme-inc'], $this->authHeader($token));

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
    }

    public function test_lists_only_organizations_the_user_belongs_to(): void
    {
        [$user, $token] = $this->actingUser();
        $mine = Organization::factory()->create();
        $mine->users()->attach($user->id, ['role' => 'member']);
        Organization::factory()->create(); // not the user's

        $response = $this->getJson('/api/organizations', $this->authHeader($token));

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'organizations');
        $response->assertJsonPath('organizations.0.id', $mine->id);
        $response->assertJsonPath('organizations.0.role', 'member');
    }

    public function test_a_non_member_cannot_view_an_organization(): void
    {
        [, $token] = $this->actingUser();
        $organization = Organization::factory()->create();

        $this->getJson("/api/organizations/{$organization->id}", $this->authHeader($token))->assertStatus(403);
    }

    public function test_a_member_can_view_but_not_update_an_organization(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'member']);

        $this->getJson("/api/organizations/{$organization->id}", $this->authHeader($token))->assertStatus(200);
        $this->putJson("/api/organizations/{$organization->id}", ['name' => 'New name'], $this->authHeader($token))
            ->assertStatus(403);
    }

    public function test_an_admin_can_update_the_organization(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'admin']);

        $response = $this->putJson("/api/organizations/{$organization->id}", ['name' => 'New name'], $this->authHeader($token));

        $response->assertStatus(200);
        $response->assertJsonPath('name', 'New name');
        $this->assertSame('New name', $organization->fresh()->name);
    }

    public function test_a_member_cannot_delete_the_organization(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'member']);

        $this->deleteJson("/api/organizations/{$organization->id}", [], $this->authHeader($token))->assertStatus(403);
        $this->assertNotNull($organization->fresh());
    }

    public function test_an_admin_can_delete_the_organization(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'admin']);

        $this->deleteJson("/api/organizations/{$organization->id}", [], $this->authHeader($token))->assertStatus(204);
        $this->assertNull($organization->fresh());
    }
}
