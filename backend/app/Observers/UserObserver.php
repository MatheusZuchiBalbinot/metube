<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\User;
use App\Services\CacheService;

class UserObserver
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Flush the channel info cache when profile fields visible on channel pages change.
     */
    public function updated(User $user): void
    {
        $channelFields = ['name', 'avatar', 'bio'];
        $isChannelDataChanged = collect($channelFields)->contains(fn (string $field) => $user->wasChanged($field));

        if (!$isChannelDataChanged) {
            return;
        }

        $this->cache->forgetChannel($user->uuid);
    }
}
