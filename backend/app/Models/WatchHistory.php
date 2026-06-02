<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HistoryPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property float|null $watched_percent
 * @property Carbon $watched_at
 */
class WatchHistory extends Model
{
    use HasFactory;

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'watched_percent', 'watched_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['watched_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * @param Builder<WatchHistory> $query
     *
     * @return Builder<WatchHistory>
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * @param Builder<WatchHistory> $query
     *
     * @return Builder<WatchHistory>
     */
    public function scopeForVideo(Builder $query, int $videoId): Builder
    {
        return $query->where('video_id', $videoId);
    }

    /**
     * @param Builder<WatchHistory> $query
     *
     * @return Builder<WatchHistory>
     */
    public function scopeRecentDays(Builder $query, int $days = 30): Builder
    {
        return $query->where('watched_at', '>=', now()->subDays($days));
    }

    /**
     * @param Builder<WatchHistory> $query
     *
     * @return Builder<WatchHistory>
     */
    public function scopeGroupedByDate(Builder $query): Builder
    {
        return $query->orderByDesc('watched_at');
    }

    /**
     * Filter history by video VUID using a joined query.
     *
     * @param Builder<WatchHistory> $query
     * @param string $vuid Video VUID
     *
     * @return Builder<WatchHistory>
     */
    public function scopeByVideoVuid(Builder $query, string $vuid): Builder
    {
        return $query->whereHas('video', fn ($q) => $q->where('vuid', $vuid));
    }

    /**
     * Restrict history to a time window. HistoryPeriod::ALL applies no constraint.
     *
     * @param Builder<WatchHistory> $query
     * @param HistoryPeriod $period Time window to filter by
     *
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
