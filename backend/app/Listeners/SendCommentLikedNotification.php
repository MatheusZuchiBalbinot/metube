<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CommentLiked;
use App\Notifications\CommentLikedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendCommentLikedNotification implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify the comment author when their comment is liked.
     *
     * Skips the notification if the liker is the same user as the comment author.
     */
    public function handle(CommentLiked $event): void
    {
        $isSameUser = $event->comment->user_id === $event->liker->id;

        if ($isSameUser) {
            return;
        }

        $event->comment->user->notify(new CommentLikedNotification($event->comment, $event->liker));
    }
}
