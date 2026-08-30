<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\CommentLikeBuilder;
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
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): CommentLikeBuilder
    {
        return new CommentLikeBuilder($query);
    }
}
