<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\User;
use App\Services\CacheService;

class UserObserver
{
    /** Defers this observer until commit — see VideoObserver::$afterCommit. */
    public bool $afterCommit = true;

    public function __construct(private readonly CacheService $cache) {}

    public function updated(User $user): void
    {
        $channelFields = ['name', 'avatar', 'bio'];
        $isChannelDataChanged = collect($channelFields)->contains(fn (string $field) => $user->wasChanged($field));

        if (!$isChannelDataChanged) {
            return;
        }

        $this->cache->forgetChannel($user->uuid);

        // video.meta embeds the channel relation, so it must be invalidated too.
        $user->videos()->pluck('vuid')->each(fn (string $vuid) => $this->cache->forgetVideo($vuid));
    }
}
