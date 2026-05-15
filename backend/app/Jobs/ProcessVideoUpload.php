<?php

namespace App\Jobs;

use App\Enums\VideoStatus;
use App\Events\VideoPublished;
use App\Events\VideoStatusUpdated;
use App\Models\Video;
use App\Services\VideoStorageService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessVideoUpload implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /**
     * @param  Video  $video  Freshly created video record (status=PROCESSING)
     * @param  string  $tmpPath  Path relative to the 'local' disk
     * @param  string|null  $tmpThumbnailPath  Path relative to the 'local' disk, or null
     */
    public function __construct(
        private readonly Video $video,
        private readonly string $tmpPath,
        private readonly ?string $tmpThumbnailPath = null,
    ) {}

    /**
     * Move files from temp storage to public storage and update the video record.
     */
    public function handle(VideoStorageService $storage): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            $storage->cleanupTmp($this->tmpPath, $this->tmpThumbnailPath);

            return;
        }

        $thumbnailUrl = $this->tmpThumbnailPath !== null
            ? $storage->publishThumbnail($this->tmpThumbnailPath, $video->vuid)
            : null;

        $newStatus = $this->resolveStatus($video);
        $publishedAt = $newStatus === VideoStatus::PUBLISHED ? $video->created_at : $video->scheduled_at;

        $video->update([
            'thumbnail_url' => $thumbnailUrl,
            'video_url' => $storage->publishVideo($this->tmpPath, $video->vuid),
            'status' => $newStatus,
            'published_at' => $publishedAt,
        ]);

        event(new VideoStatusUpdated($video, $newStatus));

        $isPublished = $newStatus === VideoStatus::PUBLISHED;
        if ($isPublished) {
            event(new VideoPublished($video));
        }
    }

    /**
     * Clean up temporary files and mark the video as failed.
     */
    public function failed(\Throwable $_): void
    {
        app(VideoStorageService::class)->cleanupTmp($this->tmpPath, $this->tmpThumbnailPath);
        $video = Video::find($this->video->id);
        if ($video !== null) {
            $video->update(['status' => VideoStatus::FAILED]);
            event(new VideoStatusUpdated($video, VideoStatus::FAILED));
        }
    }

    /**
     * Determine the final status after processing.
     *
     * A video with a future scheduled_at becomes SCHEDULED so it stays hidden
     * until the scheduler publishes it. Otherwise it goes live immediately.
     */
    private function resolveStatus(Video $video): VideoStatus
    {
        $isScheduled = $video->scheduled_at !== null && $video->scheduled_at->isFuture();

        return $isScheduled ? VideoStatus::SCHEDULED : VideoStatus::PUBLISHED;
    }
}
