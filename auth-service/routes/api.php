<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\OrganizationController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/api-keys', [ApiKeyController::class, 'index']);
Route::post('/api-keys', [ApiKeyController::class, 'store']);
Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'revoke']);

Route::middleware('api.key')->group(function () {
    Route::get('/api-keys/validate', [ApiKeyController::class, 'validateKey']);

    // "Acting user" for these is the API key's owner (see
    // ValidateApiKey's Auth::setUser call) -- there's no separate user
    // login/session system, per this project's existing single-actor-
    // per-key design (see dashboard/src/api/client.ts's stop-gap note).
    Route::apiResource('organizations', OrganizationController::class);
});
