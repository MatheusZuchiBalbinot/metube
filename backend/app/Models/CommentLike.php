<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\CommentLikeBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * @property int $user_id
 * @property int $comment_id
 */
class CommentLike extends Pivot
{
    /** @var string */
    public $table = 'comment_likes';

    /** @var bool */
    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'comment_id'];

    /** @var bool */
    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comment(): BelongsTo
    {
        return $this->belongsTo(Comment::class);
    }

    /**
     * Create a new typed Eloquent query builder for the model.
     *
     * @param QueryBuilder $query
     *
     * @return CommentLikeBuilder
     */
    public function newEloquentBuilder($query): CommentLikeBuilder
    {
        return new CommentLikeBuilder($query);
    }

    /**
     * Filter likes by user.
     *
     * @param Builder<CommentLike> $query
     * @param int $userId User ID
     *
     * @return Builder<CommentLike>
     */
    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Filter likes for a comment.
     *
     * @param Builder<CommentLike> $query
     * @param int $commentId Comment ID
     *
     * @return Builder<CommentLike>
     */
    public function scopeForComment(Builder $query, int $commentId): Builder
    {
        return $query->where('comment_id', $commentId);
    }

    /**
     * Filter likes for multiple comments.
     *
     * @param Builder<CommentLike> $query
     * @param array<int> $commentIds Comment IDs
     *
     * @return Builder<CommentLike>
     */
    public function scopeForComments(Builder $query, array $commentIds): Builder
    {
        return $query->whereIn('comment_id', $commentIds);
    }
}
