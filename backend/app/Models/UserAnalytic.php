<?php

namespace App\Models;

use App\Enums\VideoEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $video_id
 * @property int|null $channel_id
 * @property \App\Enums\VideoEventType $event_type
 * @property string|null $source
 * @property string|null $session_id
 * @property array<string, mixed>|null $payload
 * @property \Illuminate\Support\Carbon $occurred_at
 * @property \App\Models\User $user
 * @property \App\Models\Video|null $video
 * @property \App\Models\User|null $channel
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
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video the event is about, if any.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Get the channel the event is about, if any.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'channel_id');
    }
}
