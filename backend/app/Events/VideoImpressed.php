<?php

declare(strict_types=1);

namespace App\Events;

use App\Contracts\LoggableUserEvent;
use App\Enums\VideoEventType;
use App\Enums\VideoSource;
use App\Models\User;
use App\Models\Video;

class VideoImpressed implements LoggableUserEvent
{
    public function __construct(
        public readonly User $user,
        public readonly Video $video,
        public readonly VideoSource $source,
        public readonly ?int $position = null,
        public readonly ?string $sessionId = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array
    {
        $payload = [];

        if ($this->position !== null) {
            $payload['position'] = $this->position;
        }

        return [
            'user_id' => $this->user->id,
            'video_id' => $this->video->id,
            'event_type' => VideoEventType::IMPRESSION->value,
            'source' => $this->source->value,
            'session_id' => $this->sessionId,
            'payload' => $payload === [] ? null : $payload,
        ];
    }
}
