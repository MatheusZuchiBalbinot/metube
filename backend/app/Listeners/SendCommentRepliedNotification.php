<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CommentCreated;
use App\Notifications\CommentRepliedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendCommentRepliedNotification implements ShouldQueueAfterCommit
{
    /** @var string */
    public $queue = 'notifications';

    /** @var int */
    public $tries = 3;

    /**
     * Notify the parent comment author when their comment receives a reply.
     *
     * Skips the notification if there is no parent comment, or if the replier
     * is the same user as the parent comment's author.
     */
    public function handle(CommentCreated $event): void
    {
        $reply = $event->comment;
        $isReply = $reply->parent_id !== null;

        if (!$isReply) {
            return;
        }

        $parent = $reply->parent;

        if ($parent === null) {
            return;
        }

        $isSameUser = $parent->user_id === $event->author->id;

        if ($isSameUser) {
            return;
        }

        $parent->user->notify(new CommentRepliedNotification($reply, $event->author));
    }
}
