<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Models\Video;
use App\Services\VideoStorageService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ProcessVideoUpload implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /**
     * @param Video $video Freshly created video record (status=PROCESSING)
     * @param string $tmpPath Path relative to the 'local' disk
     * @param string|null $tmpThumbnailPath Path relative to the 'local' disk, or null
     */
    public function __construct(
        private readonly Video $video,
        private readonly string $tmpPath,
        private readonly ?string $tmpThumbnailPath = null,
    ) {}

    /**
     * Move files from temp storage to public storage and update the video record.
     *
     * Both batch and single uploads land in DRAFT so the creator can review
     * AI suggestions before publishing — VideoPublished fires only later,
     * when the creator explicitly publishes from the staging page.
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

        $videoUrl = $storage->publishVideo($this->tmpPath, $video->vuid);

        $this->finalize($video, $videoUrl, $thumbnailUrl);
    }

    /**
     * Finalize an upload (batch or single): move to DRAFT and kick off
     * transcription. Does NOT fire VideoPublished — that happens later when
     * the creator explicitly publishes from the staging page.
     *
     * @param string $videoUrl Public URL of the published video file
     * @param string|null $thumbnailUrl Public URL of the thumbnail, or null
     */
    private function finalize(Video $video, string $videoUrl, ?string $thumbnailUrl): void
    {
        $video->update([
            'thumbnail_url' => $thumbnailUrl,
            'video_url' => $videoUrl,
            'status' => VideoStatus::DRAFT,
        ]);

        event(new VideoStatusUpdated($video, VideoStatus::DRAFT));

        TranscodeVideoToHls::dispatch($video);
    }

    /**
     * Clean up temporary files and mark the video as failed.
     */
    public function failed(Throwable $_): void
    {
        app(VideoStorageService::class)->cleanupTmp($this->tmpPath, $this->tmpThumbnailPath);
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        $video->update(['status' => VideoStatus::FAILED]);
        event(new VideoStatusUpdated($video, VideoStatus::FAILED));
    }
}
