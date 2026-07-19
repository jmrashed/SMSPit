<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Non-secret lookup identifier shown to the owner (e.g.
            // "sms_live_ab12cd34"); the actual secret is never stored,
            // only its hash below -- see Day 33's generation endpoint.
            $table->string('key')->unique();
            $table->string('secret_hash');
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->json('scopes')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};
