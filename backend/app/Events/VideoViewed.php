<?php

namespace App\Events;

use App\Contracts\LoggableUserEvent;
use App\Enums\VideoEventType;
use App\Enums\VideoSource;
use App\Models\User;
use App\Models\Video;

class VideoViewed implements LoggableUserEvent
{
    public function __construct(
        public readonly User $user,
        public readonly Video $video,
        public readonly ?VideoSource $source = null,
        public readonly ?string $sessionId = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array
    {
        return [
            'user_id' => $this->user->id,
            'video_id' => $this->video->id,
            'event_type' => VideoEventType::VIEW->value,
            'source' => $this->source?->value,
            'session_id' => $this->sessionId,
        ];
    }
}
