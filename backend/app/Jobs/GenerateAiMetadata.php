<?php

declare(strict_types=1);

namespace App\Jobs;

use App\AI\Contracts\AiClient;
use App\AI\Prompts\VideoMetadataPrompt;
use App\Events\AiSuggestionReady;
use App\Exceptions\AiException;
use App\Models\Video;
use App\Notifications\VideoAiSummaryReadyNotification;
use App\Services\AiMetadataService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Stores summary (key_points, chapters, reading_mode). For batch uploads,
 * auto-applies suggested tags/title/description. For single uploads, creates
 * pending suggestions for creator review.
 */
class GenerateAiMetadata implements ShouldBeUnique, ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 120;

    /** @var int Attempts before marking as failed */
    public int $tries = 5;

    /** @var int Seconds the uniqueness lock is held while the job is queued/running */
    public int $uniqueFor = 3600;

    /**
     * Ensure at most one AI metadata job per video is queued/running at a time.
     *
     * @return string Unique lock key derived from the video id
     */
    public function uniqueId(): string
    {
        return (string) $this->video->id;
    }

    /**
     * Exponential backoff: 60s, 5min, 15min, 30min between retries.
     *
     * @return array<int>
     */
    public function backoff(): array
    {
        return [60, 300, 900, 1800];
    }

    /**
     * @param Video $video Published video whose transcription is complete
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('default');
    }

    /**
     * @throws AiException If AI provider returns an error
     */
    public function handle(AiClient $ai, AiMetadataService $service): void
    {
        $video = Video::with('transcription')->find($this->video->id);

        if ($video === null) {
            return;
        }

        $hasContent = $video->transcription !== null
            && \is_string($video->transcription->content)
            && \trim($video->transcription->content) !== '';

        if (!$hasContent) {
            $contentLength = $video->transcription !== null
                ? strlen((string) $video->transcription->content)
                : 0;

            Log::warning('GenerateAiMetadata: skipping — transcription content is empty or missing', [
                'vuid' => $video->vuid,
                'has_transcription' => $video->transcription !== null,
                'content_length' => $contentLength,
            ]);

            return;
        }

        Log::info('GenerateAiMetadata: calling AI provider', ['vuid' => $video->vuid]);

        $prompt = new VideoMetadataPrompt($video);
        $result = $ai->execute($prompt);

        $service->apply($video, $result);

        Log::info('GenerateAiMetadata: metadata applied successfully', ['vuid' => $video->vuid]);

        $video->channel->notify(new VideoAiSummaryReadyNotification($video));

        if ($video->is_batch) {
            return;
        }

        event(new AiSuggestionReady($video));
    }

    public function failed(Throwable $e): void
    {
        Log::error('GenerateAiMetadata: all retries exhausted', [
            'vuid' => $this->video->vuid ?? 'unknown',
            'message' => $e->getMessage(),
        ]);
    }
}
