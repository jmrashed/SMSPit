<?php

use App\Http\Controllers\ApiKeyController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/api-keys', [ApiKeyController::class, 'index']);
Route::post('/api-keys', [ApiKeyController::class, 'store']);
Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'revoke']);

Route::middleware('api.key')->get('/api-keys/validate', [ApiKeyController::class, 'validateKey']);
