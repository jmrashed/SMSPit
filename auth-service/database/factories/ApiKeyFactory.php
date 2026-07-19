<?php

namespace Database\Factories;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<ApiKey>
 */
class ApiKeyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'key' => 'sms_live_'.bin2hex(random_bytes(8)),
            'secret_hash' => Hash::make(bin2hex(random_bytes(24))),
            'owner_id' => User::factory(),
            'scopes' => [],
            'last_used_at' => null,
            'revoked_at' => null,
        ];
    }
}
