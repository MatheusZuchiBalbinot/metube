<?php

namespace App\Events;

use App\Models\User;

class UserProfileUpdated
{
    public function __construct(
        public readonly User $user,
    ) {}
}
