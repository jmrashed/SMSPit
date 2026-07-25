<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::firstOrCreate(
            ['slug' => 'default'],
            ['name' => 'Default Organization'],
        );

        // Without at least one admin member, the org exists in the DB but
        // is invisible through the API -- OrganizationController@index
        // scopes to $request->user()->organizations.
        $firstUser = User::orderBy('id')->first();
        if ($firstUser && ! $organization->users()->where('user_id', $firstUser->id)->exists()) {
            $organization->users()->attach($firstUser->id, ['role' => 'admin']);
        }
    }
}
