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
            // Populated by sms-service calling ai-service's /detect-otp
            // on capture (Day 68); null when no OTP was detected or
            // ai-service was unreachable.
            $table->string('otp')->nullable()->after('body');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('otp');
        });
    }
};
