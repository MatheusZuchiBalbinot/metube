<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\UserVideoReactionBuilder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * @property int $user_id
 * @property int $video_id
 * @property string $type
 */
class UserVideoReaction extends Pivot
{
    /** @var string */
    public $table = 'user_video_reactions';

    /** @var bool */
    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'type'];

    /** @var bool */
    public $timestamps = false;

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): UserVideoReactionBuilder
    {
        return new UserVideoReactionBuilder($query);
    }
}
