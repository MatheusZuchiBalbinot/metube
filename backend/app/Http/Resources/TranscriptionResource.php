<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\TranscriptionStatus;
use App\Jobs\TranscribeVideo;
use App\Models\Transcription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Transcription */
class TranscriptionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $isProcessing = $this->status === TranscriptionStatus::PROCESSING;

        return [
            'status' => $this->status->value,
            'language' => $this->language,
            'content' => $this->status === TranscriptionStatus::COMPLETED ? $this->content : null,
            'started_at' => $isProcessing ? $this->started_at?->toIso8601String() : null,
            'estimated_seconds' => $isProcessing ? $this->estimatedSeconds() : null,
        ];
    }

    /**
     * Returns null when the video duration is unknown.
     */
    private function estimatedSeconds(): ?float
    {
        $duration = $this->video->duration;
        $hasDuration = $duration !== null;

        if (!$hasDuration) {
            return null;
        }

        return round($duration / TranscribeVideo::SPEED_FACTOR);
    }
}
