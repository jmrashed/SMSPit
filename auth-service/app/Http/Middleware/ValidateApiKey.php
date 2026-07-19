<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token || ! str_contains($token, '.')) {
            return response()->json([
                'code' => 'UNAUTHORIZED',
                'message' => 'Missing or malformed API key',
                'details' => null,
            ], 401);
        }

        [$lookupKey, $secret] = explode('.', $token, 2);

        $apiKey = ApiKey::where('key', $lookupKey)->first();

        if (! $apiKey || $apiKey->revoked_at !== null || ! Hash::check($secret, $apiKey->secret_hash)) {
            return response()->json([
                'code' => 'UNAUTHORIZED',
                'message' => 'Invalid or revoked API key',
                'details' => null,
            ], 401);
        }

        $apiKey->forceFill(['last_used_at' => now()])->save();
        $request->attributes->set('api_key', $apiKey);

        return $next($request);
    }
}
