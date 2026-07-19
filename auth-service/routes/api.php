<?php

use App\Http\Controllers\ApiKeyController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/api-keys', [ApiKeyController::class, 'store']);
