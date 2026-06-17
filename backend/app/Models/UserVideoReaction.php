<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReactionType;
use App\Models\Builders\UserVideoReactionBuilder;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * Filter reactions by user.
     *
     * @param Builder<UserVideoReaction> $query
     * @param int $userId User ID
     *
     * @return Builder<UserVideoReaction>
     */
    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Filter reactions for a video.
     *
     * @param Builder<UserVideoReaction> $query
     * @param int $videoId Video ID
     *
     * @return Builder<UserVideoReaction>
     */
    public function scopeForVideo(Builder $query, int $videoId): Builder
    {
        return $query->where('video_id', $videoId);
    }

    /**
     * Filter reactions of a specific type.
     *
     * @param Builder<UserVideoReaction> $query
     * @param string $type Reaction type (LIKE, DISLIKE)
     *
     * @return Builder<UserVideoReaction>
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Filter like reactions only.
     *
     * @param Builder<UserVideoReaction> $query
     *
     * @return Builder<UserVideoReaction>
     */
    public function scopeLikes(Builder $query): Builder
    {
        return $query->where('type', ReactionType::LIKE->value);
    }

    /**
     * Filter dislike reactions only.
     *
     * @param Builder<UserVideoReaction> $query
     *
     * @return Builder<UserVideoReaction>
     */
    public function scopeDislikes(Builder $query): Builder
    {
        return $query->where('type', ReactionType::DISLIKE->value);
    }
}
