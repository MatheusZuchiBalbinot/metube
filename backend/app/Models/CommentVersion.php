<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\CommentVersionBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * @property int $id
 * @property int $comment_id
 * @property string $content
 * @property int $version
 * @property string $created_at
 */
class CommentVersion extends Model
{
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['comment_id', 'content', 'version'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['version' => 'integer'];
    }

    /**
     * Get the comment this version belongs to.
     *
     * @return BelongsTo<Comment, $this>
     */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(Comment::class);
    }

    /**
     * Create a new typed Eloquent query builder for the model.
     *
     * @param QueryBuilder $query
     *
     * @return CommentVersionBuilder
     */
    public function newEloquentBuilder($query): CommentVersionBuilder
    {
        return new CommentVersionBuilder($query);
    }

    /**
     * Order versions by version number, newest first.
     *
     * @param Builder<CommentVersion> $query
     *
     * @return Builder<CommentVersion>
     */
    public function scopeNewest(Builder $query): Builder
    {
        return $query->orderByDesc('version');
    }
}
