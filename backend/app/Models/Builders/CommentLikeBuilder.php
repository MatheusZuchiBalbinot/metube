<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\CommentLike;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the CommentLike model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language (CommentLike::query()->byUser($id)->forComment($id))
 * while keeping full static analysis support under PHPStan level 8.
 *
 * @extends Builder<CommentLike>
 */
class CommentLikeBuilder extends Builder
{
    /**
     * Filter likes by user.
     *
     * @param int $userId User ID
     */
    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    /**
     * Filter likes for a comment.
     *
     * @param int $commentId Comment ID
     */
    public function forComment(int $commentId): self
    {
        return $this->where('comment_id', $commentId);
    }

    /**
     * Filter likes for multiple comments.
     *
     * @param array<int> $commentIds Comment IDs
     */
    public function forComments(array $commentIds): self
    {
        return $this->whereIn('comment_id', $commentIds);
    }
}
