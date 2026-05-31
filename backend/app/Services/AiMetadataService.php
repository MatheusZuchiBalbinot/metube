<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\VideoMetadataResult;
use App\Enums\AiSuggestionStatus;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;

/**
 * Service for applying AI-generated metadata to videos.
 *
 * Handles storing summaries, applying suggestions in batch mode,
 * and creating pending suggestions for single uploads.
 */
class AiMetadataService
{
    /**
     * Apply AI metadata result to a video.
     *
     * - Always stores summary (key_points, chapters, reading_mode)
     * - For batch uploads: auto-applies tags/title/description when empty
     * - For single uploads: creates pending suggestion for review
     *
     * @param Video $video The video to apply metadata to
     * @param VideoMetadataResult $result The AI-generated metadata
     */
    public function apply(Video $video, VideoMetadataResult $result): void
    {
        $this->storeSummary($video, $result);

        if ($video->is_batch) {
            $this->autoApplyToBatch($video, $result);
        } else {
            $this->storePendingSuggestion($video, $result);
        }
    }

    /**
     * Store the video summary.
     */
    private function storeSummary(Video $video, VideoMetadataResult $result): void
    {
        VideoSummary::updateOrCreate(
            ['video_id' => $video->id],
            [
                'key_points' => $result->keyPoints,
                'chapters' => $result->chapters,
                'reading_mode' => $result->readingMode,
            ],
        );
    }

    /**
     * Auto-apply metadata when fields are empty (batch mode).
     */
    private function autoApplyToBatch(Video $video, VideoMetadataResult $result): void
    {
        $updates = [];

        $hasNoTags = \count($video->tags ?? []) === 0;

        if ($hasNoTags) {
            $updates['tags'] = $result->suggestedTags;
        }

        $hasNoDescription = \trim($video->description ?? '') === '';

        if ($hasNoDescription) {
            $updates['description'] = $result->suggestedDescription;
        }

        $updates['title'] = $result->suggestedTitle;

        $video->update($updates);
    }

    /**
     * Store pending suggestion for creator review (single mode).
     */
    private function storePendingSuggestion(Video $video, VideoMetadataResult $result): void
    {
        VideoAiSuggestion::updateOrCreate(
            ['video_id' => $video->id],
            [
                'suggested_title' => $result->suggestedTitle,
                'suggested_description' => $result->suggestedDescription,
                'suggested_tags' => $result->suggestedTags,
                'status' => AiSuggestionStatus::PENDING,
            ],
        );
    }
}
