<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrganizationRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizations = $request->user()->organizations;

        return response()->json([
            'organizations' => $organizations->map(fn (Organization $org) => $this->toResource($org, $org->pivot->role)),
        ]);
    }

    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        $organization = Organization::create($request->validated());
        $organization->users()->attach($request->user()->id, ['role' => 'admin']);

        return response()->json($this->toResource($organization, 'admin'), 201);
    }

    public function show(Request $request, Organization $organization): JsonResponse
    {
        $this->authorize('view', $organization);

        $role = $organization->users()->wherePivot('user_id', $request->user()->id)->first()->pivot->role;

        return response()->json($this->toResource($organization, $role));
    }

    public function update(UpdateOrganizationRequest $request, Organization $organization): JsonResponse
    {
        $this->authorize('update', $organization);

        $organization->update($request->validated());

        return response()->json($this->toResource($organization, 'admin'));
    }

    public function destroy(Request $request, Organization $organization): JsonResponse
    {
        $this->authorize('delete', $organization);

        $organization->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function toResource(Organization $organization, string $viewerRole): array
    {
        return [
            'id' => $organization->id,
            'name' => $organization->name,
            'slug' => $organization->slug,
            'role' => $viewerRole,
            'created_at' => $organization->created_at->toIso8601String(),
        ];
    }
}
