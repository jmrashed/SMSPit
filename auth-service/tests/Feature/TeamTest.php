<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\Organization;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TeamTest extends TestCase
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
            'key' => 'sms_live_team_test_'.$user->id,
            'secret_hash' => Hash::make($secret),
            'owner_id' => $user->id,
            'scopes' => [],
        ]);

        return [$user, "sms_live_team_test_{$user->id}.{$secret}"];
    }

    private function authHeader(string $token): array
    {
        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_an_admin_can_create_a_team(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'admin']);

        $response = $this->postJson(
            "/api/organizations/{$organization->id}/teams",
            ['name' => 'Engineering'],
            $this->authHeader($token),
        );

        $response->assertStatus(201);
        $response->assertJsonPath('name', 'Engineering');
        $response->assertJsonPath('organization_id', $organization->id);
    }

    public function test_a_member_cannot_create_a_team(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'member']);

        $this->postJson("/api/organizations/{$organization->id}/teams", ['name' => 'Engineering'], $this->authHeader($token))
            ->assertStatus(403);
    }

    public function test_a_member_can_list_teams(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'member']);
        Team::factory()->create(['organization_id' => $organization->id]);

        $response = $this->getJson("/api/organizations/{$organization->id}/teams", $this->authHeader($token));

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'teams');
    }

    public function test_a_non_member_cannot_list_teams(): void
    {
        [, $token] = $this->actingUser();
        $organization = Organization::factory()->create();

        $this->getJson("/api/organizations/{$organization->id}/teams", $this->authHeader($token))->assertStatus(403);
    }

    public function test_an_admin_can_add_an_org_member_to_a_team(): void
    {
        [$admin, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($admin->id, ['role' => 'admin']);
        $member = User::factory()->create();
        $organization->users()->attach($member->id, ['role' => 'member']);
        $team = Team::factory()->create(['organization_id' => $organization->id]);

        $response = $this->postJson(
            "/api/organizations/{$organization->id}/teams/{$team->id}/members",
            ['user_id' => $member->id],
            $this->authHeader($token),
        );

        $response->assertStatus(200);
        $this->assertTrue($team->fresh()->users()->wherePivot('user_id', $member->id)->exists());
    }

    public function test_cannot_add_a_non_org_member_to_a_team(): void
    {
        [$admin, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($admin->id, ['role' => 'admin']);
        $outsider = User::factory()->create();
        $team = Team::factory()->create(['organization_id' => $organization->id]);

        $response = $this->postJson(
            "/api/organizations/{$organization->id}/teams/{$team->id}/members",
            ['user_id' => $outsider->id],
            $this->authHeader($token),
        );

        $response->assertStatus(422);
        $this->assertFalse($team->fresh()->users()->wherePivot('user_id', $outsider->id)->exists());
    }

    public function test_an_admin_can_remove_a_team_member(): void
    {
        [$admin, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($admin->id, ['role' => 'admin']);
        $member = User::factory()->create();
        $organization->users()->attach($member->id, ['role' => 'member']);
        $team = Team::factory()->create(['organization_id' => $organization->id]);
        $team->users()->attach($member->id);

        $response = $this->deleteJson(
            "/api/organizations/{$organization->id}/teams/{$team->id}/members/{$member->id}",
            [],
            $this->authHeader($token),
        );

        $response->assertStatus(200);
        $this->assertFalse($team->fresh()->users()->wherePivot('user_id', $member->id)->exists());
    }

    public function test_a_team_from_another_organization_is_not_found(): void
    {
        [$user, $token] = $this->actingUser();
        $organization = Organization::factory()->create();
        $organization->users()->attach($user->id, ['role' => 'admin']);
        $otherOrgTeam = Team::factory()->create();

        $response = $this->postJson(
            "/api/organizations/{$organization->id}/teams/{$otherOrgTeam->id}/members",
            ['user_id' => $user->id],
            $this->authHeader($token),
        );

        $response->assertStatus(404);
    }
}
