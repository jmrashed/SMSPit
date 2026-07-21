<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Owned by auth-service per the centralized migration decision
// (see docs/architecture.md#database-migrations); the messages table
// itself is read/written by sms-service, not auth-service.
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Populated by sms-service calling ai-service's /detect-spam
            // on capture (Day 73, mirroring Days 68/71's wiring); null if
            // ai-service was unreachable. Also the target of the manual
            // "mark as not spam" override (PATCH .../spam).
            $table->boolean('is_spam')->nullable()->after('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('is_spam');
        });
    }
};
