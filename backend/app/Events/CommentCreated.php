<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class CommentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly Comment $comment,
        public readonly User $author,
        public readonly Video $video,
        public readonly int $commentCount,
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
        return ['comment_count' => $this->commentCount];
    }

    public function broadcastAs(): string
    {
        return 'CommentCreated';
    }
}
