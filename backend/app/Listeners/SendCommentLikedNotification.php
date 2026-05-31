<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CommentLiked;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\CommentLikedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendCommentLikedNotification implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    /**
     * Notify the comment author when their comment is liked.
     *
     * Skips the notification if the liker is the same user as the comment author.
     */
    public function handle(CommentLiked $event): void
    {
        if ($this->shouldSkipSelfNotification($event->liker, $event->comment->user)) {
            return;
        }

        $event->comment->user->notify(new CommentLikedNotification($event->comment, $event->liker));
    }
}
