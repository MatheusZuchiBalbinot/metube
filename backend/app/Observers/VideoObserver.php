<?php

namespace App\Observers;

use App\Models\Video;
use App\Services\CacheService;
use Illuminate\Support\Facades\Cache;

class VideoObserver
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Flush the video meta cache and, when feed-visible fields change, the feed cache too.
     */
    public function updated(Video $video): void
    {
        $this->cache->forgetVideo($video->vuid);

        $affectsFeed = $video->wasChanged('status') || $video->wasChanged('published_at');
        if ($affectsFeed) {
            Cache::tags(['feed'])->flush();
        }
    }

    /**
     * Flush the video meta cache and the feed cache when a video is removed.
     */
    public function deleted(Video $video): void
    {
        $this->cache->forgetVideo($video->vuid);
        Cache::tags(['feed'])->flush();
    }
}
