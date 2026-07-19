<?php

namespace App\Http\Controllers;

use App\Http\Requests\AddTeamMemberRequest;
use App\Http\Requests\StoreTeamRequest;
use App\Models\Organization;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request, Organization $organization): JsonResponse
    {
        $this->authorize('view', $organization);

        return response()->json([
            'teams' => $organization->teams()->with('users')->get()->map(fn (Team $team) => $this->toResource($team)),
        ]);
    }

    public function store(StoreTeamRequest $request, Organization $organization): JsonResponse
    {
        $this->authorize('update', $organization);

        $team = $organization->teams()->create($request->validated());

        return response()->json($this->toResource($team), 201);
    }

    public function addMember(AddTeamMemberRequest $request, Organization $organization, Team $team): JsonResponse
    {
        $this->authorize('update', $organization);
        $this->ensureTeamBelongsToOrganization($organization, $team);

        $userId = $request->validated('user_id');

        // A team's members are expected to also be members of the team's
        // organization -- see docs/multi-tenancy.md's invariant note.
        if (! $organization->users()->wherePivot('user_id', $userId)->exists()) {
            abort(422, 'User must be a member of the organization before joining one of its teams.');
        }

        $team->users()->syncWithoutDetaching([$userId]);

        return response()->json($this->toResource($team->fresh('users')));
    }

    public function removeMember(Request $request, Organization $organization, Team $team, User $user): JsonResponse
    {
        $this->authorize('update', $organization);
        $this->ensureTeamBelongsToOrganization($organization, $team);

        $team->users()->detach($user->id);

        return response()->json($this->toResource($team->fresh('users')));
    }

    private function ensureTeamBelongsToOrganization(Organization $organization, Team $team): void
    {
        abort_unless($team->organization_id === $organization->id, 404, 'Team not found in this organization.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toResource(Team $team): array
    {
        return [
            'id' => $team->id,
            'organization_id' => $team->organization_id,
            'name' => $team->name,
            'members' => $team->users->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email]),
            'created_at' => $team->created_at->toIso8601String(),
        ];
    }
}
