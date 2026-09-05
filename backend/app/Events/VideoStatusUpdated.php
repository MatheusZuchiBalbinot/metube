<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Carbon;

/** @see AiSuggestionReady for why this implements ShouldBroadcast+ShouldRescue. */
class VideoStatusUpdated implements ShouldBroadcast, ShouldRescue
{
    use Dispatchable, InteractsWithSockets;

    /** @var int Emission order, in milliseconds — see broadcastWith() */
    public readonly int $emittedAtMs;

    /**
     * @param VideoStatus|null $previousStatus Previous status (for transition context)
     */
    public function __construct(
        public readonly Video $video,
        public readonly VideoStatus $newStatus,
        public readonly ?VideoStatus $previousStatus = null,
    ) {
        $this->emittedAtMs = (int) Carbon::now()->valueOf();
    }

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
            // Lets the frontend drop a broadcast delivered out of order.
            'emitted_at_ms' => $this->emittedAtMs,
        ];
    }

    public function broadcastAs(): string
    {
        return 'VideoStatusUpdated';
    }
}
