<?php

namespace App\Jobs;

use App\Enums\AiSuggestionStatus;
use App\Events\AiSuggestionReady;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;
use App\Notifications\VideoAiSummaryReadyNotification;
use App\Services\IAService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\RequestException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateAiMetadata implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /** @var int Max seconds this job may run */
    public int $timeout = 120;

    /** @var int Attempts before marking as failed */
    public int $tries = 5;

    /**
     * Exponential backoff: 60s, 5min, 15min, 30min between retries.
     *
     * @return int[]
     */
    public function backoff(): array
    {
        return [60, 300, 900, 1800];
    }

    /**
     * @param  Video  $video  Published video whose transcription is complete
     */
    public function __construct(private readonly Video $video)
    {
        $this->onQueue('default');
    }

    /**
     * Generate AI summary and metadata from the video transcription via Gemini.
     *
     * Saves VideoSummary (key_points, chapters, reading_mode). For batch
     * uploads, auto-applies suggested tags/title/description when fields are
     * empty. For single uploads, stores suggestions in VideoAiSuggestion for
     * the creator to review.
     *
     * @throws \Illuminate\Http\Client\ConnectionException
     * @throws RequestException
     * @throws \RuntimeException
     */
    public function handle(IAService $gemini): void
    {
        $video = Video::with('transcription')->find($this->video->id);

        $isVideoMissing = $video === null;
        if ($isVideoMissing) {
            return;
        }

        $hasNoContent = $video->transcription === null
            || ! is_string($video->transcription->content)
            || trim($video->transcription->content) === '';

        if ($hasNoContent) {
            Log::warning('GenerateAiMetadata: skipping — transcription content is empty', ['vuid' => $video->vuid]);

            return;
        }

        try {
            $result = $gemini->generate($this->buildPrompt($video));
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $isRateLimit = $e->response->status() === 429;
            if ($isRateLimit) {
                Log::warning('GenerateAiMetadata: Gemini rate limit hit, will retry with backoff', ['vuid' => $video->vuid, 'attempt' => $this->attempts()]);
                $this->release($this->backoff()[$this->attempts() - 1] ?? 1800);

                return;
            }
            throw $e;
        }

        $this->validateResult($result, $video->vuid);

        VideoSummary::updateOrCreate(
            ['video_id' => $video->id],
            [
                'key_points' => $result['key_points'],
                'chapters' => $result['chapters'],
                'reading_mode' => $result['reading_mode'],
            ],
        );

        if ($video->is_batch) {
            $this->autoApply($video, $result);
        } else {
            $this->storeSuggestion($video, $result);
            AiSuggestionReady::dispatch($video);
        }

        $video->channel->notify(new VideoAiSummaryReadyNotification($video));
    }

    /**
     * Log the error when all retries are exhausted — transcription stays intact.
     */
    public function failed(\Throwable $e): void
    {
        $vuid = $this->video->vuid ?? 'unknown';

        Log::error('GenerateAiMetadata: all retries exhausted', [
            'vuid' => $vuid,
            'message' => $e->getMessage(),
        ]);
    }

    /**
     * Build the structured prompt that instructs Gemini to return JSON.
     */
    private function buildPrompt(Video $video): string
    {
        $title = $video->title;
        $description = $video->description ?? '';
        $content = (string) $video->transcription?->content;
        $lang = $video->transcription->language ?? 'pt';

        return <<<PROMPT
        You are a video content analyzer. Given the title, description and full transcription of a video, return ONLY valid JSON with this exact structure — no markdown, no explanation:
        {
          "key_points": ["string"],
          "chapters": [{"timestamp": "HH:MM:SS", "title": "string"}],
          "reading_mode": "string",
          "suggested_tags": ["string"],
          "suggested_title": "string",
          "suggested_description": "string"
        }

        Rules:
        - key_points: 3 to 7 concise takeaways, each under 120 characters
        - chapters: detect natural topic breaks (minimum 2), use HH:MM:SS format
        - reading_mode: flowing prose summary, 150 to 300 words
        - suggested_tags: 3 to 6 relevant lowercase tags, no spaces (use hyphens)
        - suggested_title: improved, engaging title under 80 characters
        - suggested_description: engaging description between 80 and 200 characters
        - IMPORTANT: ALL text fields (key_points, reading_mode, suggested_title, suggested_description) MUST be written in the same language as the transcription (language code: {$lang})

        Video title: {$title}
        Video description: {$description}
        Transcription:
        {$content}
        PROMPT;
    }

    /**
     * Validate that all required keys are present in the Gemini response.
     *
     * @param  array<string, mixed>  $result
     *
     * @throws \RuntimeException
     */
    private function validateResult(array $result, string $vuid): void
    {
        $required = ['key_points', 'chapters', 'reading_mode', 'suggested_tags', 'suggested_title', 'suggested_description'];

        foreach ($required as $key) {
            $isMissing = ! array_key_exists($key, $result);
            if ($isMissing) {
                throw new \RuntimeException("Gemini response missing required key '{$key}' for video {$vuid}");
            }
        }
    }

    /**
     * Auto-apply tags, title and description when fields are empty (batch upload).
     *
     * @param  array<string, mixed>  $result
     */
    private function autoApply(Video $video, array $result): void
    {
        $updates = [];

        $hasNoTags = count($video->tags ?? []) === 0;
        if ($hasNoTags) {
            $updates['tags'] = $result['suggested_tags'];
        }

        $hasNoDescription = trim($video->description ?? '') === '';
        if ($hasNoDescription) {
            $updates['description'] = $result['suggested_description'];
        }

        $updates['title'] = $result['suggested_title'];

        $video->update($updates);
    }

    /**
     * Store pending suggestion for creator review (single upload).
     *
     * @param  array<string, mixed>  $result
     */
    private function storeSuggestion(Video $video, array $result): void
    {
        VideoAiSuggestion::updateOrCreate(
            ['video_id' => $video->id],
            [
                'suggested_title' => $result['suggested_title'],
                'suggested_description' => $result['suggested_description'],
                'suggested_tags' => $result['suggested_tags'],
                'status' => AiSuggestionStatus::PENDING,
            ],
        );
    }
}
