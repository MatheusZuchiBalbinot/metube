<?php

namespace App\Services;

use App\DTOs\VideoMetadataResult;
use App\Enums\AiSuggestionStatus;
use App\Events\AiSuggestionReady;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;

/**
 * Service to apply AI-generated metadata to videos.
 *
 * Handles persistence of video summary (key points, chapters, reading mode)
 * and manages the flow for batch vs. single uploads:
 * - Batch: auto-applies suggestions
 * - Single: stores for creator review
 */
class AiMetadataService
{
    /**
     * Apply AI metadata to a video.
     *
     * For batch uploads, auto-applies all suggestions.
     * For single uploads, stores suggestions for creator review and dispatches AiSuggestionReady event.
     *
     * @param  Video  $video  The video to update
     * @param  VideoMetadataResult  $result  AI-generated metadata
     */
    public function apply(Video $video, VideoMetadataResult $result): void
    {
        $this->persistSummary($video, $result);

        if ($video->is_batch) {
            $this->autoApply($video, $result);
        } else {
            $this->storeSuggestion($video, $result);
            AiSuggestionReady::dispatch($video);
        }
    }

    /**
     * Persist video summary (key points, chapters, reading mode).
     */
    private function persistSummary(Video $video, VideoMetadataResult $result): void
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
     * Auto-apply suggestions for batch uploads.
     *
     * Always applies suggested title. Applies tags only if empty.
     * Applies description only if empty.
     */
    private function autoApply(Video $video, VideoMetadataResult $result): void
    {
        $updates = ['title' => $result->suggestedTitle];

        $hasNoTags = count($video->tags ?? []) === 0;
        if ($hasNoTags) {
            $updates['tags'] = $result->suggestedTags;
        }

        $hasNoDescription = blank($video->description);
        if ($hasNoDescription) {
            $updates['description'] = $result->suggestedDescription;
        }

        $video->update($updates);
    }

    /**
     * Store pending suggestion for creator review (single upload).
     */
    private function storeSuggestion(Video $video, VideoMetadataResult $result): void
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
