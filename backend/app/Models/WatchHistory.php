<?php

namespace App\Models;

use App\Enums\HistoryPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property string $watched_at
 */
class WatchHistory extends Model
{
    use HasFactory;

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'watched_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'watched_at' => 'datetime',
        ];
    }

    /**
     * Get the user who watched the video.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the video that was watched.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\App\Models\Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Filter watch history by period.
     *
     * @param  Builder<WatchHistory>  $query
     * @return Builder<WatchHistory>
     */
    public function scopeFilterByPeriod(Builder $query, HistoryPeriod $period): Builder
    {
        $startDate = $period->startDate();
        if ($startDate === null) {
            return $query;
        }

        return $query->where('watched_at', '>=', $startDate);
    }
}
