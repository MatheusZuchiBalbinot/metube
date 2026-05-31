<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationType;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class CommentLikedNotification extends Notification
{
    public function __construct(
        public readonly Comment $comment,
        public readonly User $liker,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => NotificationType::COMMENT_LIKED->value,
            'liker_name' => $this->liker->name,
            'cuid' => $this->comment->cuid,
            'vuid' => $this->comment->video->vuid,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
