<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VideoEventType;
use App\Models\Builders\UserAnalyticBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $video_id
 * @property int|null $channel_id
 * @property VideoEventType $event_type
 * @property string|null $source
 * @property string|null $session_id
 * @property array<string, mixed>|null $payload
 * @property Carbon $occurred_at
 * @property User $user
 * @property Video|null $video
 * @property User|null $channel
 */
class UserAnalytic extends Model
{
    /** @var string */
    protected $table = 'user_analytics';

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'video_id',
        'channel_id',
        'event_type',
        'source',
        'session_id',
        'payload',
        'occurred_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'event_type' => VideoEventType::class,
            'occurred_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    /**
     * Get the user who triggered the event.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video the event is about, if any.
     *
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Get the channel the event is about, if any.
     *
     * @return BelongsTo<User, $this>
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'channel_id');
    }

    /**
     * Create a typed Eloquent builder for this model.
     *
     * @param QueryBuilder $query
     *
     * @return UserAnalyticBuilder
     */
    public function newEloquentBuilder($query): UserAnalyticBuilder
    {
        return new UserAnalyticBuilder($query);
    }
}
