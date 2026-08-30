<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\CommentVersionBuilder;
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
     * @return BelongsTo<Comment, $this>
     */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(Comment::class);
    }

    /**
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): CommentVersionBuilder
    {
        return new CommentVersionBuilder($query);
    }
}
