<?php

namespace App\Notifications;

use App\Enums\NotificationType;
use App\Models\Video;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class VideoTranscribedNotification extends Notification
{
    public function __construct(public readonly Video $video) {}

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
            'type' => NotificationType::VIDEO_TRANSCRIBED->value,
            'vuid' => $this->video->vuid,
            'video_title' => $this->video->title,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
