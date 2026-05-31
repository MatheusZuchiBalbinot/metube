<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\VideoSummaryDTO;
use App\Enums\AiSuggestionStatus;
use App\Models\Video;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * VideoAiService — Handles AI-generated content for videos.
 *
 * Responsible for:
 * - Retrieving AI summaries (with caching)
 * - Managing AI-generated suggestions (accept/dismiss)
 */
class VideoAiService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Get AI-generated summary for a video.
     *
     * Caches the summary forever once generated (it is immutable). Does not cache
     * null so the result appears immediately after the AI finishes without waiting
     * for a TTL to expire.
     *
     * @param Video $video Video to get summary for
     *
     * @return VideoSummaryDTO Summary with keyPoints, chapters, readingMode
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
     * Accept pending AI suggestions and apply them to the video.
     *
     * Updates video title, description, and tags with suggested values,
     * then marks the suggestion as accepted.
     *
     * @param Video $video Video to accept suggestions for
     *
     * @throws ModelNotFoundException When no suggestion exists
     */
    public function acceptAiSuggestion(Video $video): void
    {
        $suggestion = $video->aiSuggestion ?? throw new ModelNotFoundException('AI suggestion not found.');

        $videoUpdatePayload = [
            'title' => $suggestion->suggested_title ?? $video->title,
            'description' => $suggestion->suggested_description ?? $video->description,
            'tags' => ($suggestion->suggested_tags !== []) ? $suggestion->suggested_tags : $video->tags,
        ];
        $video->update($videoUpdatePayload);

        $suggestionUpdatePayload = ['status' => AiSuggestionStatus::ACCEPTED];
        $suggestion->update($suggestionUpdatePayload);

        $this->cache->forgetVideo($video->vuid);
    }

    /**
     * Dismiss pending AI suggestions without applying them.
     *
     * Marks the suggestion as dismissed so it is no longer presented to the user.
     *
     * @param Video $video Video to dismiss suggestions for
     *
     * @throws ModelNotFoundException When no suggestion exists
     */
    public function dismissAiSuggestion(Video $video): void
    {
        $suggestion = $video->aiSuggestion ?? throw new ModelNotFoundException('AI suggestion not found.');

        $dismissPayload = ['status' => AiSuggestionStatus::DISMISSED];
        $suggestion->update($dismissPayload);
    }
}
