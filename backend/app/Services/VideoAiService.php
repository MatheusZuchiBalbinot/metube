<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\VideoSummaryDTO;
use App\Enums\AiSuggestionStatus;
use App\Enums\TranscriptionLimit;
use App\Models\Video;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * VideoAiService — Handles AI-generated content for videos.
 *
 * Responsible for:
 * - Retrieving AI summaries (with caching)
 * - Managing AI-generated suggestions (accept/dismiss)
 */
final class VideoAiService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Caches the summary forever once generated (it is immutable). Does not cache
     * null so the result appears immediately after the AI finishes without waiting
     * for a TTL to expire.
     */
    public function getSummary(Video $video): VideoSummaryDTO
    {
        $summary = $this->cache->getOrCacheVideoSummary(
            $video->vuid,
            fn () => $video->summary,
        );

        return $summary !== null
            ? VideoSummaryDTO::fromModel($summary)
            : VideoSummaryDTO::empty();
    }

    /**
     * @throws ModelNotFoundException When no suggestion exists
     */
    public function acceptAiSuggestion(Video $video): void
    {
        $suggestion = $video->aiSuggestion ?? throw new ModelNotFoundException('AI suggestion not found.');

        $videoUpdatePayload = [
            'title' => $suggestion->suggested_title ?? $video->title,
            'description' => $suggestion->suggested_description ?? $video->description,
            'tags' => $suggestion->suggested_tags !== [] ? $suggestion->suggested_tags : $video->tags,
        ];
        $video->update($videoUpdatePayload);

        $suggestionUpdatePayload = ['status' => AiSuggestionStatus::ACCEPTED];
        $suggestion->update($suggestionUpdatePayload);

        $this->cache->forgetVideo($video->vuid);
    }

    /**
     * @throws ModelNotFoundException When no suggestion exists
     */
    public function dismissAiSuggestion(Video $video): void
    {
        $suggestion = $video->aiSuggestion ?? throw new ModelNotFoundException('AI suggestion not found.');

        $dismissPayload = ['status' => AiSuggestionStatus::DISMISSED];
        $suggestion->update($dismissPayload);
    }

    /**
     * Combines the video's title, description, summary, and transcription into a
     * grounded prompt that instructs the model to answer only from video content.
     * The transcription is truncated to TranscriptionLimit::MAX_CHARS_FOR_CHAT to
     * stay within token budgets.
     *
     * @param Video $video Video whose context to embed (must have summary relation loaded)
     */
    public function buildVideoSystemPrompt(Video $video, string $transcriptionContent): string
    {
        $truncated = mb_substr($transcriptionContent, 0, TranscriptionLimit::MAX_CHARS_FOR_CHAT->value);

        $intro = implode('', [
            'You are a helpful assistant answering questions about a specific video.',
            ' Use only the information provided below to answer.',
            ' If the answer is not in the video content, say so clearly.',
        ]);

        $prompt = <<<PROMPT
{$intro}

VIDEO TITLE: {$video->title}
PROMPT;

        $hasDescription = $video->description !== '';

        if ($hasDescription) {
            $prompt .= "\nVIDEO DESCRIPTION: {$video->description}";
        }

        $summary = $video->summary;
        $hasReadingMode = $summary !== null && $summary->reading_mode !== null && $summary->reading_mode !== '';

        if ($hasReadingMode) {
            $prompt .= "\n\nSUMMARY:\n{$summary->reading_mode}";
        }

        $hasKeyPoints = $summary !== null && count($summary->key_points) > 0;

        if ($hasKeyPoints) {
            $keyPoints = implode("\n- ", $summary->key_points);
            $prompt .= "\n\nKEY POINTS:\n- {$keyPoints}";
        }

        $prompt .= "\n\nFULL TRANSCRIPTION:\n{$truncated}";

        return $prompt;
    }
}
