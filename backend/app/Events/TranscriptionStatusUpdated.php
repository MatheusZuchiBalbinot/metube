<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\TranscriptionStatus;
use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Carbon;

/**
 * Broadcasts via the queue (not ShouldBroadcastNow) so a Reverb outage gets
 * Horizon's normal retry instead of throwing synchronously into the job.
 */
class TranscriptionStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    /** @var int Emission order, in milliseconds — see broadcastWith() */
    public readonly int $emittedAtMs;

    /**
     * @param Carbon|null $startedAt When transcription began (set on PROCESSING)
     * @param float|null $estimatedSeconds Expected total seconds to complete (set on PROCESSING)
     */
    public function __construct(
        public readonly Video $video,
        public readonly TranscriptionStatus $status,
        public readonly ?Carbon $startedAt = null,
        public readonly ?float $estimatedSeconds = null,
    ) {
        $this->emittedAtMs = Carbon::now()->valueOf();
    }

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
            // Lets the frontend drop a broadcast delivered out of order.
            'emitted_at_ms' => $this->emittedAtMs,
        ];
    }

    public function broadcastAs(): string
    {
        return 'TranscriptionStatusUpdated';
    }
}
