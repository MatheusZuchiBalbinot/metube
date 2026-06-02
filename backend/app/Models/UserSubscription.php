<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property int $user_id
 * @property int $channel_id
 */
class UserSubscription extends Pivot
{
    /** @var string */
    public $table = 'user_subscriptions';

    /** @var bool */
    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'channel_id'];

    /** @var bool */
    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The subscribing user. Semantic alias of {@see user()} (the user_id side).
     *
     * @return BelongsTo<User, $this>
     */
    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'channel_id');
    }

    /**
     * @param Builder<UserSubscription> $query
     *
     * @return Builder<UserSubscription>
     */
    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * @param Builder<UserSubscription> $query
     *
     * @return Builder<UserSubscription>
     */
    public function scopeToChannel(Builder $query, int $channelId): Builder
    {
        return $query->where('channel_id', $channelId);
    }

    /**
     * @param Builder<UserSubscription> $query
     *
     * @return Builder<UserSubscription>
     */
    public function scopeBetween(Builder $query, int $userId, int $channelId): Builder
    {
        return $query->where('user_id', $userId)->where('channel_id', $channelId);
    }

    /**
     * Filter subscriptions by both user and channel.
     *
     * @param Builder<UserSubscription> $query
     * @param int $userId User ID
     * @param int $channelId Channel ID
     *
     * @return Builder<UserSubscription>
     */
    public function scopeFromUserToChannel(Builder $query, int $userId, int $channelId): Builder
    {
        return $query->where('user_id', $userId)->where('channel_id', $channelId);
    }
}
