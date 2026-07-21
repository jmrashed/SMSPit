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
            // Populated by sms-service calling ai-service's /classify on
            // capture (Day 71, mirroring Day 68's OTP wiring); one of
            // otp/transactional/marketing/other, null if ai-service was
            // unreachable.
            $table->string('category')->nullable()->after('otp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
