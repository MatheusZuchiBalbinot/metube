<?php

namespace App\Jobs;

use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

/**
 * ProcessVideoUpload — Moves an uploaded video from temporary to public storage.
 *
 * Dispatched immediately after the HTTP upload completes. The video record
 * starts with status=PROCESSING and is updated to PUBLISHED/SCHEDULED on success
 * or FAILED on exhausted retries.
 */
class ProcessVideoUpload implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /**
     * @param  Video  $video  The freshly created video record
     * @param  string  $tmpPath  Path relative to the 'local' disk (e.g. uploads/tmp/{vuid}.mp4)
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
    public function handle(): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            $this->cleanupTmp();
            return;
        }

        $ext = pathinfo($this->tmpPath, PATHINFO_EXTENSION);
        $finalPath = "videos/{$video->vuid}.{$ext}";

        Storage::disk('public')->put(
            $finalPath,
            Storage::disk('local')->readStream($this->tmpPath),
        );
        Storage::disk('local')->delete($this->tmpPath);

        $updates = ['video_url' => '/storage/' . $finalPath];

        if ($this->tmpThumbnailPath !== null) {
            $thumbPath = "thumbnails/{$video->vuid}.webp";
            $tmpFullPath = Storage::disk('local')->path($this->tmpThumbnailPath);

            $webp = (new ImageManager(new Driver()))
                ->read($tmpFullPath)
                ->scaleDown(width: 1280, height: 720)
                ->toWebp(quality: 80);

            Storage::disk('public')->put($thumbPath, (string) $webp);
            Storage::disk('local')->delete($this->tmpThumbnailPath);

            $updates['thumbnail_url'] = '/storage/' . $thumbPath;
        }

        $updates['status'] = $video->scheduled_at?->isFuture()
            ? VideoStatus::SCHEDULED
            : VideoStatus::PUBLISHED;

        $video->update($updates);
    }

    /**
     * Clean up temporary files and mark the video as failed.
     */
    public function failed(\Throwable $e): void
    {
        $this->cleanupTmp();
        Video::find($this->video->id)?->update(['status' => VideoStatus::FAILED]);
    }

    private function cleanupTmp(): void
    {
        Storage::disk('local')->delete($this->tmpPath);

        if ($this->tmpThumbnailPath !== null) {
            Storage::disk('local')->delete($this->tmpThumbnailPath);
        }
    }
}
