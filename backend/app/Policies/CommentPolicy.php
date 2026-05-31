<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Comment;
use App\Models\User;

/**
 * CommentPolicy — Authorization rules for comments.
 */
class CommentPolicy
{
    /**
     * Determine if user can update this comment.
     */
    public function update(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id;
    }

    /**
     * Determine if user can delete this comment.
     */
    public function delete(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id;
    }
}
