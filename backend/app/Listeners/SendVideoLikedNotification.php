<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\VideoLiked;
use App\Notifications\VideoLikedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendVideoLikedNotification implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify the video owner when their video is liked.
     *
     * Skips the notification if the liker is the channel owner.
     */
    public function handle(VideoLiked $event): void
    {
        $owner = $event->video->channel;
        $isSameUser = $owner->id === $event->liker->id;

        if ($isSameUser) {
            return;
        }

        $owner->notify(new VideoLikedNotification($event->video, $event->liker));
    }
}
