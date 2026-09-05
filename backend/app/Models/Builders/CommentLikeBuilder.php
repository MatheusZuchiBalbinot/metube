<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\CommentLike;
use Illuminate\Database\Eloquent\Builder;

/**
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
