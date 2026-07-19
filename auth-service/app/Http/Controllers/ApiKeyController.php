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
            'scopes' => $request->validated('scopes', []),
        ]);

        return response()->json([
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'key' => "{$key}.{$secret}",
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
            'scopes' => $apiKey->scopes,
        ]);
    }
}
