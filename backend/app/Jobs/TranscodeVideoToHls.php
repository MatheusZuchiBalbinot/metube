<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Models\Video;
use App\Services\HlsTranscodeService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Transcode a freshly published source video into a native HLS package.
 *
 * Runs after ProcessVideoUpload, which leaves the raw file at videos/{vuid}.{ext} and
 * serves it as a temporary progressive-download fallback. This job builds the HLS
 * package, populates the duration (previously never set), then deletes the source so
 * HLS becomes the only delivery format.
 *
 * For single uploads it also extracts an audio track and kicks off transcription, which
 * reads that audio rather than the (now deleted) source video. Batch uploads are not
 * transcribed, matching the existing pipeline.
 */
class TranscodeVideoToHls implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /**
     * @param Video $video Published video whose source file is ready at video_url
     */
    public function __construct(private readonly Video $video) {}

    /**
     * Build the HLS package, extract audio (single uploads), drop the source file,
     * and dispatch transcription.
     */
    public function handle(HlsTranscodeService $hls): void
    {
        $video = Video::find($this->video->id);

        $isNothingToDo = $video === null || $video->video_url === null;

        if ($isNothingToDo) {
            return;
        }

        $sourcePath = $video->video_url;
        $sourceAbsPath = Storage::disk('public')->path($sourcePath);

        $duration = $hls->probeDuration($sourceAbsPath);
        $hlsUrl = $hls->transcode($sourceAbsPath, $video->vuid);

        $isSingle = !$video->is_batch;

        if ($isSingle) {
            $hls->extractAudio($sourceAbsPath, $video->vuid);
        }

        $video->update([
            'hls_url' => $hlsUrl,
            'duration' => $duration,
            'video_url' => null,
        ]);

        Storage::disk('public')->delete($sourcePath);

        event(new VideoStatusUpdated($video, $video->status));

        if ($isSingle) {
            TranscribeVideo::dispatch($video);
        }
    }

    /**
     * Mark the video as failed when all retries are exhausted.
     *
     * The source file is left in place so a failed transcode still leaves a playable
     * progressive fallback for inspection.
     */
    public function failed(Throwable $_): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        $video->update(['status' => VideoStatus::FAILED]);
        event(new VideoStatusUpdated($video, VideoStatus::FAILED));
    }
}
