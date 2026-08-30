<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\TranscriptionStatus;
use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Carbon;

class TranscriptionStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param Carbon|null $startedAt When transcription began (set on PROCESSING)
     * @param float|null $estimatedSeconds Expected total seconds to complete (set on PROCESSING)
     */
    public function __construct(
        public readonly Video $video,
        public readonly TranscriptionStatus $status,
        public readonly ?Carbon $startedAt = null,
        public readonly ?float $estimatedSeconds = null,
    ) {}

    /**
     * Broadcast on the public video channel (video page) and the owner's private channel (useRealtime).
     *
     * @return array<int, Channel|PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("videos.{$this->video->vuid}"),
            new PrivateChannel("users.{$this->video->channel->uuid}"),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'vuid' => $this->video->vuid,
            'status' => $this->status->value,
            'started_at' => $this->startedAt?->toIso8601String(),
            'estimated_seconds' => $this->estimatedSeconds,
        ];
    }

    public function broadcastAs(): string
    {
        return 'TranscriptionStatusUpdated';
    }
}
