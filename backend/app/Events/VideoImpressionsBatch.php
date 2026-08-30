<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\VideoEventType;
use App\Enums\VideoSource;
use App\Models\User;

class VideoImpressionsBatch
{
    /**
     * @param list<array{video_id: int, position: int}> $items
     */
    public function __construct(
        public readonly User $user,
        public readonly array $items,
        public readonly VideoSource $source,
        public readonly ?string $sessionId,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function toAnalyticRows(): array
    {
        $now = now()->toDateTimeString();

        return array_map(fn (array $item) => [
            'user_id' => $this->user->id,
            'video_id' => $item['video_id'],
            'event_type' => VideoEventType::IMPRESSION->value,
            'source' => $this->source->value,
            'session_id' => $this->sessionId,
            'payload' => json_encode(['position' => $item['position']]),
            'occurred_at' => $now,
        ], $this->items);
    }
}
