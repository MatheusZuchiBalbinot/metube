<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationType;
use App\Models\Video;
use App\Notifications\Concerns\IncludesVideoThumbnail;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class VideoAiSummaryReadyNotification extends Notification
{
    use IncludesVideoThumbnail;

    /**
     * @param Video $video The video whose AI summary just finished generating
     */
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
            'type' => NotificationType::VIDEO_AI_SUMMARY_READY->value,
            'vuid' => $this->video->vuid,
            'video_title' => $this->video->title,
            'thumbnail_url' => $this->thumbnailUrl($this->video),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
