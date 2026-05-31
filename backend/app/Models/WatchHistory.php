<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property float|null $watched_percent
 * @property \Illuminate\Support\Carbon $watched_at
 */
class WatchHistory extends Model
{
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

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForVideo(Builder $query, int $videoId): Builder
    {
        return $query->where('video_id', $videoId);
    }

    public function scopeRecentDays(Builder $query, int $days = 30): Builder
    {
        return $query->where('watched_at', '>=', now()->subDays($days));
    }

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
}
