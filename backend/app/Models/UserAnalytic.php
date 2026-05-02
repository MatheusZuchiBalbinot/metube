<?php

namespace App\Models;

use App\Enums\VideoEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property \App\Enums\VideoEventType $event_type
 * @property \Illuminate\Support\Carbon $occurred_at
 * @property \App\Models\User $user
 * @property \App\Models\Video $video
 */
class UserAnalytic extends Model
{
    /** @var string */
    protected $table = 'user_analytics';

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'event_type', 'occurred_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'event_type' => VideoEventType::class,
            'occurred_at' => 'datetime',
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
     * Get the video the event is about.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}
