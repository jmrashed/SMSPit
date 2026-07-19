<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// See docs/multi-tenancy.md: org_id is nullable on both tables since
// pre-existing v0.1/v0.2 rows have no organization -- a NULL org_id
// means "ungrouped", not "belongs to every org" (see sms-service's
// query scoping, which treats it as its own bucket, not a wildcard).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_keys', function (Blueprint $table) {
            $table->foreignId('org_id')->nullable()->after('owner_id')->constrained('organizations')->nullOnDelete();
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('org_id')->nullable()->after('status')->constrained('organizations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('org_id');
        });

        Schema::table('api_keys', function (Blueprint $table) {
            $table->dropConstrainedForeignId('org_id');
        });
    }
};
