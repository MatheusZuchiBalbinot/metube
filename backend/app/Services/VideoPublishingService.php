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
     * Locked in a transaction so two concurrent calls (double-click, a retry)
     * can't both observe DRAFT and both publish.
     *
     * @throws VideoNotDraftException When $video is not in DRAFT status
     */
    public function publishVideo(Video $video): void
    {
        $published = DB::transaction(function () use ($video) {
            $locked = Video::lockForUpdate()->find($video->id);

            if ($locked === null || $locked->status !== VideoStatus::DRAFT) {
                throw new VideoNotDraftException();
            }

            $locked->update([
                'status' => VideoStatus::PUBLISHED,
                'published_at' => now(),
            ]);

            return $locked;
        });

        $this->cache->forgetVideo($published->vuid);
        event(new VideoPublished($published));
        event(new VideoStatusUpdated($published, VideoStatus::PUBLISHED));
    }

    public function updateVideo(Video $video, UpdateVideoDTO $data): Video
    {
        $video->update($data->toUpdateArray());

        return $video;
    }

    /**
     * Publish all scheduled videos that are due.
     *
     * Finds videos with status=SCHEDULED and scheduled_at <= now() and
     * publishes them one by one — a mass Eloquent update() would fire no
     * model/domain events at all, so subscriber notifications, the
     * transcription/AI-suggestion pipeline, and the owner's Reverb broadcast
     * would silently never happen for scheduled publishes.
     *
     * The claim below is also atomic (conditional UPDATE ... WHERE status =
     * SCHEDULED) as defense in depth alongside the scheduler's own
     * ->withoutOverlapping().
     */
    public function publishDueVideos(): int
    {
        // channel eager-loaded: the atomic claim below bypasses VideoObserver,
        // so its cache invalidation is replicated manually further down.
        $videos = Video::query()->scheduledDue()->with('channel')->get();

        $count = 0;

        foreach ($videos as $video) {
            $claimed = Video::query()
                ->whereKey($video->id)
                ->where('status', VideoStatus::SCHEDULED)
                ->update([
                    'status' => VideoStatus::PUBLISHED,
                    'published_at' => $video->scheduled_at,
                ]);

            if ($claimed === 0) {
                continue;
            }

            $video->status = VideoStatus::PUBLISHED;
            $video->published_at = $video->scheduled_at;

            $this->cache->forgetVideo($video->vuid);

            $channelUuid = $video->channel?->uuid;

            if ($channelUuid !== null) {
                $this->cache->forgetChannel($channelUuid);
            }

            event(new VideoPublished($video));
            event(new VideoStatusUpdated($video, VideoStatus::PUBLISHED));

            $count++;
        }

        if ($count > 0) {
            $this->cache->forgetFeed();
        }

        return $count;
    }
}
