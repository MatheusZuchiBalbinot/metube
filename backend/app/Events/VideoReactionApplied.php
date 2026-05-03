<?php

namespace App\Events;

use App\Contracts\LoggableUserEvent;
use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\Video;

class VideoReactionApplied implements LoggableUserEvent
{
    public function __construct(
        public readonly User $user,
        public readonly Video $video,
        public readonly VideoEventType $type,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array
    {
        return [
            'user_id' => $this->user->id,
            'video_id' => $this->video->id,
            'event_type' => $this->type->value,
        ];
    }
}
