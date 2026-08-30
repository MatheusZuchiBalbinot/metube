<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\UpdateVideoDTO;
use App\Enums\VideoStatus;
use App\Events\VideoPublished;
use App\Events\VideoStatusUpdated;
use App\Exceptions\VideoNotDraftException;
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
final class VideoPublishingService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Sets status to PUBLISHED, records published_at, fires VideoPublished
     * for subscriber notifications, and invalidates the video cache.
     *
     * Ownership must be checked by the caller via VideoPolicy::publish(); the
     * draft-only business rule is enforced here so every caller — controller,
     * job, artisan command, or seeder — is protected the same way.
     *
     * @throws VideoNotDraftException When $video is not in DRAFT status
     */
    public function publishVideo(Video $video): void
    {
        if ($video->status !== VideoStatus::DRAFT) {
            throw new VideoNotDraftException();
        }

        $video->update([
            'status' => VideoStatus::PUBLISHED,
            'published_at' => now(),
        ]);

        event(new VideoPublished($video));
        event(new VideoStatusUpdated($video, VideoStatus::PUBLISHED));
        $this->cache->forgetVideo($video->vuid);
    }

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
     * Finds videos with status=SCHEDULED and scheduled_at <= now() and
     * publishes them one by one — a mass Eloquent update() would fire no
     * model/domain events at all, so subscriber notifications, the
     * transcription/AI-suggestion pipeline, and the owner's Reverb broadcast
     * would silently never happen for scheduled publishes.
     */
    public function publishDueVideos(): int
    {
        $videos = Video::query()->scheduledDue()->get();

        $count = 0;

        foreach ($videos as $video) {
            $video->update([
                'status' => VideoStatus::PUBLISHED,
                'published_at' => $video->scheduled_at,
            ]);

            event(new VideoPublished($video));
            event(new VideoStatusUpdated($video, VideoStatus::PUBLISHED));

            $this->cache->forgetVideo($video->vuid);
            $count++;
        }

        if ($count > 0) {
            $this->cache->forgetFeed();
        }

        return $count;
    }
}
