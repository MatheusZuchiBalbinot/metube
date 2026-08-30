<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class VideoTranscriptionCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly Video $video,
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
        ];
    }

    public function broadcastAs(): string
    {
        return 'VideoTranscriptionCompleted';
    }
}
