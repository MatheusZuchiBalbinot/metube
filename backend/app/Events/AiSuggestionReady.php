<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Video;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AiSuggestionReady implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Video $video,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("users.{$this->video->channel->uuid}");
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
