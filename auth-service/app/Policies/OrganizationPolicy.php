<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function view(User $user, Organization $organization): bool
    {
        return $organization->users()->wherePivot('user_id', $user->id)->exists();
    }

    public function update(User $user, Organization $organization): bool
    {
        return $organization->users()->wherePivot('user_id', $user->id)->wherePivot('role', 'admin')->exists();
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $this->update($user, $organization);
    }
}
