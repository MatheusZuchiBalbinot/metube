<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exceptions\WhisperException;
use App\Models\Video;
use App\Services\VideoStorageService;
use App\Services\WhisperClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Generate English caption track for a non-English video via Whisper's translate task.
 *
 * Runs after TranscribeVideo so the original-language captions and AI summary are
 * available immediately; the English translation is appended to the video's caption
 * list once this slower second Whisper pass completes.
 *
 * Translation is best-effort: if it fails after all retries, the video keeps its
 * original-language captions and a warning is logged. The failed() method ensures
 * we don't silently drop translation failures.
 */
class TranslateVideoCaptions implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 3600;

    /** @var int Attempts before giving up */
    public int $tries = 3;

    /**
     * @param Video $video Published video whose original transcription is complete
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('transcription');
    }

    /**
     * Translate the video to English captions via Whisper and append to the video.
     *
     * WhisperException is allowed to bubble up and trigger retries. If all retries
     * exhaust, failed() logs the issue and the video keeps its original captions.
     *
     * @throws WhisperException If Whisper returns an error
     */
    public function handle(WhisperClient $whisper, VideoStorageService $storage): void
    {
        $video = Video::find($this->video->id);

        if ($video === null || $video->video_url === null) {
            return;
        }

        if ($video->hasEnglishCaptions()) {
            return;
        }

        $result = $whisper->translate($video->video_url);
        $captionPath = $storage->publishCaption($result->vtt, $video->vuid, 'en');

        $video->appendCaption(lang: 'en', label: 'English', url: $captionPath);
    }

    /**
     * Log translation failure after all retries exhausted.
     *
     * Translation is best-effort: video already has original-language captions,
     * so this is a nice-to-have that doesn't block the user experience.
     */
    public function failed(Throwable $e): void
    {
        $video = Video::find($this->video->id);

        if ($video === null) {
            return;
        }

        Log::warning('English caption translation failed after all retries', [
            'vuid' => $video->vuid,
            'error' => $e->getMessage(),
        ]);
    }
}
