<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class VideoStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param VideoStatus|null $previousStatus Previous status (for transition context)
     */
    public function __construct(
        public readonly Video $video,
        public readonly VideoStatus $newStatus,
        public readonly ?VideoStatus $previousStatus = null,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("users.{$this->video->channel->uuid}")];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'vuid' => $this->video->vuid,
            'status' => $this->newStatus->value,
            'previous_status' => $this->previousStatus?->value,
        ];
    }

    public function broadcastAs(): string
    {
        return 'VideoStatusUpdated';
    }
}
