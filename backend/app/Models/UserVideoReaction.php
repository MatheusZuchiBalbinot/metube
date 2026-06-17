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
     * Get the user who created this reaction.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video being reacted to.
     *
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Create a new typed Eloquent query builder for the model.
     *
     * @param QueryBuilder $query
     *
     * @return UserVideoReactionBuilder
     */
    public function newEloquentBuilder($query): UserVideoReactionBuilder
    {
        return new UserVideoReactionBuilder($query);
    }
}
