<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $video_id
 * @property string|null $source
 * @property string|null $session_id
 * @property Carbon $watched_at
 */
class VideoView extends Model
{
    /** @var string */
    public $table = 'video_views';

    /** @var bool */
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['user_id', 'video_id', 'source', 'session_id', 'watched_at'];

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
     * @param Builder<VideoView> $query
     *
     * @return Builder<VideoView>
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * @param Builder<VideoView> $query
     *
     * @return Builder<VideoView>
     */
    public function scopeForVideo(Builder $query, int $videoId): Builder
    {
        return $query->where('video_id', $videoId);
    }

    /**
     * @param Builder<VideoView> $query
     *
     * @return Builder<VideoView>
     */
    public function scopeWithSource(Builder $query, string $source): Builder
    {
        return $query->where('source', $source);
    }

    /**
     * @param Builder<VideoView> $query
     *
     * @return Builder<VideoView>
     */
    public function scopeWithSession(Builder $query, string $sessionId): Builder
    {
        return $query->where('session_id', $sessionId);
    }
}
