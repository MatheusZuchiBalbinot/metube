<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Video;
use App\Services\CacheService;

class VideoObserver
{
    /**
     * Defers this observer until the enclosing DB transaction commits (a
     * no-op when there is none) — otherwise a concurrent read between a
     * save() and its COMMIT could repopulate the cache with pre-commit data.
     */
    public bool $afterCommit = true;

    public function __construct(private readonly CacheService $cache) {}

    public function updated(Video $video): void
    {
        $this->cache->forgetVideo($video->vuid);
        $this->forgetOwningChannel($video);

        $affectsFeed = $video->wasChanged('status') || $video->wasChanged('published_at');

        if (!$affectsFeed) {
            return;
        }

        $this->cache->forgetFeed();
    }

    public function deleted(Video $video): void
    {
        $this->cache->forgetVideo($video->vuid);
        $this->forgetOwningChannel($video);
        $this->cache->forgetFeed();
    }

    /**
     * An already hydrated relation is reused so there is no extra query; only
     * when the relation is missing is the owner's uuid fetched in a single
     * lightweight lookup. The flush is skipped when the channel no longer
     * exists (e.g. a cascaded delete left the relation null or empty).
     */
    private function forgetOwningChannel(Video $video): void
    {
        $channelUuid = $this->resolveChannelUuid($video);

        if ($channelUuid === null) {
            return;
        }

        $this->cache->forgetChannel($channelUuid);
    }

    private function resolveChannelUuid(Video $video): ?string
    {
        if ($video->relationLoaded('channel')) {
            return $video->getRelation('channel')?->uuid;
        }

        $uuid = $video->channel()->value('uuid');

        return is_string($uuid) ? $uuid : null;
    }
}
