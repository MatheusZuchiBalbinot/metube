<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Playlist;
use App\Services\CacheService;

class PlaylistObserver
{
    public function __construct(private readonly CacheService $cache) {}

    public function created(Playlist $playlist): void
    {
        $this->cache->forgetUserPlaylists($playlist->user_id);
    }

    /**
     * Also fires when PlaylistService calls $playlist->touch() after pivot
     * operations (add/remove video, reorder), making those changes visible
     * without any manual event dispatch.
     */
    public function updated(Playlist $playlist): void
    {
        $this->cache->forgetUserPlaylists($playlist->user_id);
    }

    public function deleted(Playlist $playlist): void
    {
        $this->cache->forgetUserPlaylists($playlist->user_id);
    }
}
