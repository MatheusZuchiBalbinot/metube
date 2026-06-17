<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\PlaylistVideoBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * @property int $playlist_id
 * @property int $video_id
 * @property int $position
 */
class PlaylistVideo extends Pivot
{
    /** @var string */
    public $table = 'playlist_video';

    /** @var bool */
    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = ['playlist_id', 'video_id', 'position'];

    /** @var bool */
    public $timestamps = false;

    public function playlist(): BelongsTo
    {
        return $this->belongsTo(Playlist::class);
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    /**
     * Use the dedicated PlaylistVideoBuilder for typed, chainable queries.
     *
     * @param QueryBuilder $query
     *
     * @return PlaylistVideoBuilder
     */
    public function newEloquentBuilder($query): PlaylistVideoBuilder
    {
        return new PlaylistVideoBuilder($query);
    }

    /**
     * @param Builder<PlaylistVideo> $query
     *
     * @return Builder<PlaylistVideo>
     */
    public function scopeForPlaylist(Builder $query, int $playlistId): Builder
    {
        return $query->where('playlist_id', $playlistId);
    }

    /**
     * @param Builder<PlaylistVideo> $query
     *
     * @return Builder<PlaylistVideo>
     */
    public function scopeForVideo(Builder $query, int $videoId): Builder
    {
        return $query->where('video_id', $videoId);
    }

    /**
     * @param Builder<PlaylistVideo> $query
     *
     * @return Builder<PlaylistVideo>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('position');
    }
}
