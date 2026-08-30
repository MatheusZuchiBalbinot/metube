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
    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function forComment(int $commentId): self
    {
        return $this->where('comment_id', $commentId);
    }

    /**
     * @param array<int> $commentIds
     */
    public function forComments(array $commentIds): self
    {
        return $this->whereIn('comment_id', $commentIds);
    }
}
