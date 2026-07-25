<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// No Eloquent model exists for `templates` here on purpose -- the table
// is owned by auth-service for migrations only; sms-service is the sole
// reader/writer at runtime (see the templates migration's own comment).
// Seeding goes straight through the DB facade to match that boundary.
class TemplateSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = Organization::where('slug', 'default')->value('id');

        $templates = [
            [
                'name' => 'OTP',
                'body' => 'Your OTP is {{code}}. It expires in {{minutes}} minutes.',
                'variables' => ['code', 'minutes'],
            ],
            [
                'name' => 'Welcome',
                'body' => 'Welcome to {{app_name}}, {{name}}! We\'re glad to have you.',
                'variables' => ['app_name', 'name'],
            ],
            [
                'name' => 'Password Reset',
                'body' => 'Hi {{name}}, use the code {{code}} to reset your password. If you didn\'t request this, ignore this message.',
                'variables' => ['name', 'code'],
            ],
        ];

        foreach ($templates as $template) {
            $exists = DB::table('templates')
                ->where('name', $template['name'])
                ->where('org_id', $orgId)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('templates')->insert([
                'name' => $template['name'],
                'body' => $template['body'],
                'variables' => json_encode($template['variables']),
                'org_id' => $orgId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
