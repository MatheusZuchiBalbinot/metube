<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\VideoMetadataResult;
use App\Enums\AiSuggestionStatus;
use App\Enums\TranscriptionStatus;
use App\Jobs\GenerateAiMetadata;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoSummary;
use Illuminate\Support\Facades\Log;

/**
 * Service for applying AI-generated metadata to videos.
 *
 * Handles storing summaries, applying suggestions in batch mode,
 * and creating pending suggestions for single uploads.
 */
final class AiMetadataService
{
    /**
     * Redispatches GenerateAiMetadata for videos whose transcription
     * completed a while ago but never got a VideoSummary — recovers the
     * pipeline if the worker died between TranscribeVideo marking COMPLETED
     * and dispatching GenerateAiMetadata (see TranscribeVideo::handle()).
     *
     * @return int Number of videos reconciled
     */
    public function reconcileStuckMetadata(int $olderThanMinutes = 60): int
    {
        $threshold = now()->subMinutes($olderThanMinutes);

        $stuck = Video::query()
            ->whereHas('transcription', function ($query) use ($threshold): void {
                $query->where('status', TranscriptionStatus::COMPLETED)
                    ->where('updated_at', '<', $threshold);
            })
            ->whereDoesntHave('summary')
            ->get();

        foreach ($stuck as $video) {
            Log::warning('AiMetadataService: reconciling video with completed transcription but no AI metadata', [
                'vuid' => $video->vuid,
            ]);

            GenerateAiMetadata::dispatch($video);
        }

        return $stuck->count();
    }

    /**
     * - Always stores summary (key_points, chapters, reading_mode)
     * - For batch uploads: auto-applies tags/title/description when empty
     * - For single uploads: creates pending suggestion for review
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

    private function storeSummary(Video $video, VideoMetadataResult $result): void
    {
        $summaryPayload = [
            'key_points' => $result->keyPoints,
            'chapters' => $result->chapters,
            'reading_mode' => $result->readingMode,
        ];
        VideoSummary::updateOrCreate(
            ['video_id' => $video->id],
            $summaryPayload,
        );
    }

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

    private function storePendingSuggestion(Video $video, VideoMetadataResult $result): void
    {
        $suggestionPayload = [
            'suggested_title' => $result->suggestedTitle,
            'suggested_description' => $result->suggestedDescription,
            'suggested_tags' => $result->suggestedTags,
            'status' => AiSuggestionStatus::PENDING,
        ];
        VideoAiSuggestion::updateOrCreate(
            ['video_id' => $video->id],
            $suggestionPayload,
        );
    }
}
