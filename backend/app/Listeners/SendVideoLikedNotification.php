<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoLiked;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\VideoLikedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoLikedNotification implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    /**
     * Notify the video owner when their video is liked.
     *
     * Skips the notification if the liker is the channel owner.
     */
    public function handle(VideoLiked $event): void
    {
        $owner = $event->video->channel;

        if ($this->shouldSkipSelfNotification($event->liker, $owner)) {
            return;
        }

        $owner->notify(new VideoLikedNotification($event->video, $event->liker));
    }
}
