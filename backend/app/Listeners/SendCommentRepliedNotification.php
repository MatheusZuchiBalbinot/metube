<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CommentCreated;
use App\Listeners\Traits\SendsQueuedNotifications;
use App\Notifications\CommentRepliedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendCommentRepliedNotification implements ShouldQueueAfterCommit
{
    use SendsQueuedNotifications;

    /**
     * Notify the parent comment author when their comment receives a reply.
     *
     * Skips the notification if there is no parent comment, or if the replier
     * is the same user as the parent comment's author.
     */
    public function handle(CommentCreated $event): void
    {
        $reply = $event->comment;

        if ($reply->parent_id === null) {
            return;
        }

        $parent = $reply->parent;

        if ($parent === null) {
            return;
        }

        if ($this->shouldSkipSelfNotification($event->author, $parent->user)) {
            return;
        }

        $parent->user->notify(new CommentRepliedNotification($reply, $event->author));
    }
}
