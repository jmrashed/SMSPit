<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\TeamController;
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

    Route::get('/organizations/{organization}/teams', [TeamController::class, 'index']);
    Route::post('/organizations/{organization}/teams', [TeamController::class, 'store']);
    Route::post('/organizations/{organization}/teams/{team}/members', [TeamController::class, 'addMember']);
    Route::delete('/organizations/{organization}/teams/{team}/members/{user}', [TeamController::class, 'removeMember']);
});
