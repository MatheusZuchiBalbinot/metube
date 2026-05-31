<?php

declare(strict_types=1);

namespace App\Events;

use App\Contracts\LoggableUserEvent;
use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\Video;

class VideoFinished implements LoggableUserEvent
{
    public function __construct(
        public readonly User $user,
        public readonly Video $video,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array
    {
        return [
            'user_id' => $this->user->id,
            'video_id' => $this->video->id,
            'event_type' => VideoEventType::FINISH->value,
        ];
    }
}
