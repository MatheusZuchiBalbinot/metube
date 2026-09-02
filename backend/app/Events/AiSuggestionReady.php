<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcasts via the queue (not ShouldBroadcastNow) so a Reverb outage gets
 * Horizon's normal retry instead of throwing synchronously into the job.
 */
class AiSuggestionReady implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Video $video,
    ) {}

    /**
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
            'title' => $this->video->title,
        ];
    }

    public function broadcastAs(): string
    {
        return 'AiSuggestionReady';
    }
}
