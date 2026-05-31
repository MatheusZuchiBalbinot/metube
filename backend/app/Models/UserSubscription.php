<?php

declare(strict_types=1);

namespace App\Models;

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

    /**
     * Get the subscriber (user who subscribed).
     *
     * @return BelongsTo<User, $this>
     */
    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the channel being subscribed to.
     *
     * @return BelongsTo<User, $this>
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'channel_id');
    }
}
