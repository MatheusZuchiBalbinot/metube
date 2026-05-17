<?php

namespace App\Notifications;

use App\Enums\NotificationType;
use App\Models\Video;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class VideoFromSubscriptionNotification extends Notification
{
    public function __construct(
        public readonly Video $video,
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
            'type' => NotificationType::VIDEO_FROM_SUBSCRIPTION->value,
            'channel_name' => $this->video->channel->name,
            'vuid' => $this->video->vuid,
            'video_title' => $this->video->title,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
