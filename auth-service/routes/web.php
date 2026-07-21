<?php

use App\Support\Metrics;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Day 84 -- a scrape target, not part of the versioned API surface, so
// it lives outside routes/api.php's /api prefix (matches sms-service's
// GET /metrics, also excluded from its own versioned prefix).
Route::get('/metrics', fn () => response(Metrics::render(), 200, [
    'Content-Type' => 'text/plain; version=0.0.4',
]));
