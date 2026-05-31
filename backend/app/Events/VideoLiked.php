<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\User;
use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class VideoLiked implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly Video $video,
        public readonly User $liker,
        public readonly int $likeCount,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel("videos.{$this->video->vuid}")];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return ['like_count' => $this->likeCount];
    }

    public function broadcastAs(): string
    {
        return 'VideoLiked';
    }
}
