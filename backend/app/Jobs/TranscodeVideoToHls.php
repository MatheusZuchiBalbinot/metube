<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Models\Video;
use App\Services\HlsTranscodeService;
use App\Services\VideoStorageService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
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
 * reads that audio rather than the (now deleted) source video. If no thumbnail was
 * provided, a frame is extracted automatically at 20% of the video duration.
 * Batch uploads are not transcribed, matching the existing pipeline.
 */
class TranscodeVideoToHls implements ShouldBeUnique, ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before marking as failed */
    public int $tries = 3;

    /** @var int Seconds the uniqueness lock is held while the job is queued/running */
    public int $uniqueFor = 3600;

    /**
     * @param Video $video Published video whose source file is ready at video_url
     */
    public function __construct(private readonly Video $video) {}

    /**
     * Ensure at most one transcode job per video is queued/running at a time.
     *
     * @return string Unique lock key derived from the video id
     */
    public function uniqueId(): string
    {
        return (string) $this->video->id;
    }

    /**
     * Build the HLS package, auto-generate thumbnail if missing, extract audio
     * (single uploads), drop the source file, and dispatch transcription.
     */
    public function handle(HlsTranscodeService $hls, VideoStorageService $storage): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        if ($this->reuseExistingPackage($video, $storage)) {
            return;
        }

        $isNothingToDo = $video->video_url === null;

        if ($isNothingToDo) {
            return;
        }

        $sourcePath = $video->video_url;
        $sourceAbsPath = $storage->absolutePublicPath($sourcePath);

        Log::info('TranscodeVideoToHls: starting', ['vuid' => $video->vuid, 'source' => $sourcePath]);

        $duration = $hls->probeDuration($sourceAbsPath);
        $hlsUrl = $hls->transcode($sourceAbsPath, $video->vuid);

        Log::info('TranscodeVideoToHls: HLS package ready', ['vuid' => $video->vuid, 'hls_url' => $hlsUrl]);

        $isThumbnailMissing = $video->thumbnail_url === null && $duration !== null;

        $hls->extractAudio($sourceAbsPath, $video->vuid);
        Log::info('TranscodeVideoToHls: audio extracted', [
            'vuid' => $video->vuid,
            'audio_path' => $video->audioPath(),
        ]);

        $updates = [
            'hls_url' => $hlsUrl,
            'duration' => $duration,
            'video_url' => null,
        ];

        if ($isThumbnailMissing) {
            $thumbAbsPath = $hls->extractThumbnail($sourceAbsPath, $video->vuid, $duration);
            $updates['thumbnail_url'] = $storage->publishThumbnailFromAbsPath($thumbAbsPath, $video->vuid);
        }

        $video->update($updates);

        $storage->deletePublished($sourcePath);

        event(new VideoStatusUpdated($video, $video->status));

        Log::info('TranscodeVideoToHls: dispatching TranscribeVideo', ['vuid' => $video->vuid]);

        TranscribeVideo::dispatch($video);
    }

    /**
     * "Already transcoded" must be detected from the actual output artifact,
     * not from video_url being null — that flag is set by THIS job right
     * before it deletes the source and dispatches TranscribeVideo. If
     * anything throws after that update (e.g. deletePublished on an
     * already-removed file, or the Reverb broadcast failing), a retry would
     * otherwise see video_url === null, treat it as "nothing to do", and
     * silently drop the TranscribeVideo dispatch forever. TranscribeVideo is
     * safe to re-dispatch: it is ShouldBeUnique and no-ops when the
     * transcription is already COMPLETED.
     *
     * @return bool True when the package already exists and the caller should return early.
     */
    private function reuseExistingPackage(Video $video, VideoStorageService $storage): bool
    {
        $hlsMasterPath = "{$video->hlsDirectory()}/master.m3u8";

        if (!$storage->exists($hlsMasterPath)) {
            return false;
        }

        Log::info('TranscodeVideoToHls: HLS package already exists, ensuring transcription was dispatched', [
            'vuid' => $video->vuid,
        ]);

        TranscribeVideo::dispatch($video);

        return true;
    }

    /**
     * Mark the video as failed when all retries are exhausted.
     *
     * The source file is left in place so a failed transcode still leaves a playable
     * progressive fallback for inspection. Never downgrades an already-PUBLISHED
     * video: HLS transcoding is a post-publish enhancement step, and this progressive
     * fallback is exactly why a video that made it to PUBLISHED should stay that way
     * even if the HLS package never finishes — contradicting that would hide a
     * working, watchable video behind a failure banner.
     */
    public function failed(Throwable $_): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        $isAlreadyPublished = $video->status === VideoStatus::PUBLISHED;

        if ($isAlreadyPublished) {
            return;
        }

        $video->update(['status' => VideoStatus::FAILED]);
        event(new VideoStatusUpdated($video, VideoStatus::FAILED));
    }
}
