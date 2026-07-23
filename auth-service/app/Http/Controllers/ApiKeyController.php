<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreApiKeyRequest;
use App\Models\ApiKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ApiKeyController extends Controller
{
    public function store(StoreApiKeyRequest $request): JsonResponse
    {
        // `key` is a non-secret lookup identifier (safe to log/display);
        // `secret` is only ever returned once, here, and never stored
        // in plaintext -- only its hash is persisted.
        $key = 'sms_live_'.bin2hex(random_bytes(8));
        $secret = bin2hex(random_bytes(24));

        $apiKey = ApiKey::create([
            'name' => $request->validated('name'),
            'key' => $key,
            'secret_hash' => Hash::make($secret),
            'owner_id' => $request->validated('owner_id'),
            'org_id' => $request->validated('org_id'),
            'scopes' => $request->validated('scopes', []),
        ]);

        return response()->json([
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'key' => "{$key}.{$secret}",
            'org_id' => $apiKey->org_id,
            'scopes' => $apiKey->scopes,
            'created_at' => $apiKey->created_at->toIso8601String(),
        ], 201);
    }

    public function validateKey(Request $request): JsonResponse
    {
        /** @var ApiKey $apiKey */
        $apiKey = $request->attributes->get('api_key');

        return response()->json([
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'owner_id' => $apiKey->owner_id,
            'org_id' => $apiKey->org_id,
            'scopes' => $apiKey->scopes,
        ]);
    }

    public function index(): JsonResponse
    {
        $apiKeys = ApiKey::orderBy('created_at', 'desc')->get();

        return response()->json([
            'api_keys' => $apiKeys->map(fn (ApiKey $apiKey) => $this->toResource($apiKey)),
        ]);
    }

    public function revoke(ApiKey $apiKey): JsonResponse
    {
        if ($apiKey->revoked_at === null) {
            $apiKey->forceFill(['revoked_at' => now()])->save();
        }

        return response()->json($this->toResource($apiKey));
    }

    /**
     * Replaces a key with a fresh secret while keeping the same name,
     * owner, org, and scopes -- the old key is revoked (not deleted, same
     * as `revoke`) so any in-flight requests using it are auditable
     * rather than silently orphaned. A rotated *and already revoked* key
     * still produces a live replacement, mirroring `revoke`'s idempotency
     * (rotating is always safe to retry).
     */
    public function rotate(ApiKey $apiKey): JsonResponse
    {
        $key = 'sms_live_'.bin2hex(random_bytes(8));
        $secret = bin2hex(random_bytes(24));

        $newApiKey = ApiKey::create([
            'name' => $apiKey->name,
            'key' => $key,
            'secret_hash' => Hash::make($secret),
            'owner_id' => $apiKey->owner_id,
            'org_id' => $apiKey->org_id,
            'scopes' => $apiKey->scopes,
        ]);

        if ($apiKey->revoked_at === null) {
            $apiKey->forceFill(['revoked_at' => now()])->save();
        }

        return response()->json([
            'id' => $newApiKey->id,
            'name' => $newApiKey->name,
            'key' => "{$key}.{$secret}",
            'org_id' => $newApiKey->org_id,
            'scopes' => $newApiKey->scopes,
            'rotated_from' => $apiKey->id,
            'created_at' => $newApiKey->created_at->toIso8601String(),
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function toResource(ApiKey $apiKey): array
    {
        return [
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'key' => $apiKey->key,
            'owner_id' => $apiKey->owner_id,
            'org_id' => $apiKey->org_id,
            'scopes' => $apiKey->scopes,
            'last_used_at' => $apiKey->last_used_at?->toIso8601String(),
            'revoked_at' => $apiKey->revoked_at?->toIso8601String(),
            'created_at' => $apiKey->created_at->toIso8601String(),
        ];
    }
}
