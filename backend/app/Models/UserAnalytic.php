<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VideoEventType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
     * Filter events from a specific user.
     *
     * @param Builder<UserAnalytic> $query
     * @param int $userId User ID
     *
     * @return Builder<UserAnalytic>
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Filter events from the last N days.
     *
     * @param Builder<UserAnalytic> $query
     * @param int $days Number of days (default 30)
     *
     * @return Builder<UserAnalytic>
     */
    public function scopeRecentDays(Builder $query, int $days = 30): Builder
    {
        return $query->where('occurred_at', '>=', now()->subDays($days));
    }

    /**
     * Filter events of a specific type.
     *
     * @param Builder<UserAnalytic> $query
     * @param VideoEventType $eventType
     *
     * @return Builder<UserAnalytic>
     */
    public function scopeOfType(Builder $query, VideoEventType $eventType): Builder
    {
        return $query->where('event_type', $eventType);
    }
}
