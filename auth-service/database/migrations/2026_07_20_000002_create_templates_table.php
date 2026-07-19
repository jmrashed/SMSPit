<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Owned by auth-service per the centralized migration decision (see
// docs/architecture.md#database-migrations); the templates table itself
// is read/written by sms-service, not auth-service, same as `messages`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Body uses {{variable}} placeholders; `variables` declares
            // which ones the template expects, so a consumer (Day 62's
            // picker UI) can render an input for each without parsing
            // the body itself.
            $table->text('body');
            $table->json('variables')->default('[]');
            // Nullable/ungrouped bucket, same reasoning as messages.org_id
            // and api_keys.org_id (Day 59) -- see docs/multi-tenancy.md.
            $table->foreignId('org_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates');
    }
};
