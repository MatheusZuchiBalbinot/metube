<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * A user may only update their own profile.
     */
    public function update(User $user, User $target): bool
    {
        return $user->id === $target->id;
    }
}
