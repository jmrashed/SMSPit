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
        Schema::create('messages', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('to');
            $table->string('from');
            $table->text('body');
            $table->enum('status', ['captured', 'failed'])->default('captured');
            $table->timestamp('created_at')->useCurrent();

            $table->index('to');
            $table->index('from');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
