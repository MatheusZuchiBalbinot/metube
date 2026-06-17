<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\UserSubscriptionBuilder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Query\Builder as QueryBuilder;

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
     * Create a typed Eloquent builder for this model.
     *
     * @param QueryBuilder $query
     *
     * @return UserSubscriptionBuilder
     */
    public function newEloquentBuilder($query): UserSubscriptionBuilder
    {
        return new UserSubscriptionBuilder($query);
    }
}
