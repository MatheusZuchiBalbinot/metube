<?php

namespace App\Events;

use App\Contracts\LoggableUserEvent;
use App\Enums\VideoEventType;
use App\Models\User;

class SearchPerformed implements LoggableUserEvent
{
    public function __construct(
        public readonly User $user,
        public readonly string $query,
        public readonly int $resultCount,
        public readonly ?string $sessionId = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array
    {
        return [
            'user_id' => $this->user->id,
            'event_type' => VideoEventType::SEARCH->value,
            'session_id' => $this->sessionId,
            'payload' => [
                'query' => $this->query,
                'result_count' => $this->resultCount,
            ],
        ];
    }
}
