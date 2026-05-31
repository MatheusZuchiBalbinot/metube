<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\UpdateVideoDTO;
use App\Enums\VideoStatus;
use App\Events\VideoPublished;
use App\Events\VideoStatusUpdated;
use App\Models\Video;
use Illuminate\Support\Facades\DB;

/**
 * VideoPublishingService — Handles video publication and metadata updates.
 *
 * Responsible for:
 * - Publishing draft videos immediately
 * - Publishing scheduled videos when due
 * - Updating video metadata (title, description, tags)
 */
class VideoPublishingService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Publish a draft video immediately.
     *
     * Sets status to PUBLISHED, records published_at, fires VideoPublished
     * for subscriber notifications, and invalidates the video cache.
     *
     * Authorization must be checked by caller via VideoPolicy::publish().
     *
     * @param Video $video Video in DRAFT status to publish
     */
    public function publishVideo(Video $video): void
    {
        $video->update([
            'status' => VideoStatus::PUBLISHED,
            'published_at' => now(),
        ]);

        event(new VideoPublished($video));
        event(new VideoStatusUpdated($video, VideoStatus::PUBLISHED));
        $this->cache->forgetVideo($video->vuid);
    }

    /**
     * Update video metadata (title, description, tags).
     *
     * @param Video $video Video to update
     * @param UpdateVideoDTO $data Updated metadata
     *
     * @return Video Updated video
     */
    public function updateVideo(Video $video, UpdateVideoDTO $data): Video
    {
        return DB::transaction(function () use ($video, $data) {
            $video->update($data->toUpdateArray());

            return $video;
        });
    }

    /**
     * Publish all scheduled videos that are due.
     *
     * Finds videos with status=SCHEDULED and scheduled_at <= now(),
     * publishes them in bulk, and clears relevant caches.
     *
     * @return int Number of videos published
     */
    public function publishDueVideos(): int
    {
        $vuids = Video::scheduledDue()->pluck('vuid');

        if ($vuids->isEmpty()) {
            return 0;
        }

        $count = Video::query()
            ->whereIn('vuid', $vuids)
            ->update([
                'status' => VideoStatus::PUBLISHED,
                'published_at' => DB::raw('scheduled_at'),
                'updated_at' => now(),
            ]);

        foreach ($vuids as $vuid) {
            $this->cache->forgetVideo($vuid);
        }

        $this->cache->forgetFeed();

        return $count;
    }
}
