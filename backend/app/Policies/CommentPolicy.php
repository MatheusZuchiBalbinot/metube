<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Comment;
use App\Models\User;

class CommentPolicy
{
    public function update(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id;
    }

    public function delete(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id;
    }

    /**
     * Determine if user can view the edit history of this comment.
     *
     * Allowed for the comment's own author (reviewing their own edits) or the
     * owning channel of the video the comment belongs to (moderation). Any
     * other authenticated user is denied — edit history is not public.
     */
    public function viewVersions(User $user, Comment $comment): bool
    {
        $isAuthor = $user->id === $comment->user_id;

        if ($isAuthor) {
            return true;
        }

        return $user->id === $comment->video->channel_id;
    }
}
