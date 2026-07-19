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
            $table->string('replayed_from')->nullable()->after('status');
            $table->foreign('replayed_from')->references('id')->on('messages')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['replayed_from']);
            $table->dropColumn('replayed_from');
        });
    }
};
