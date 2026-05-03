<?php

namespace App\Events;

use App\Contracts\LoggableUserEvent;
use App\Enums\VideoEventType;
use App\Models\User;

class ChannelSubscribed implements LoggableUserEvent
{
    public function __construct(
        public readonly User $subscriber,
        public readonly User $channel,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array
    {
        return [
            'user_id' => $this->subscriber->id,
            'channel_id' => $this->channel->id,
            'event_type' => VideoEventType::SUBSCRIBE->value,
        ];
    }
}
