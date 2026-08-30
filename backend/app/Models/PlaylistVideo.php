<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Builders\PlaylistVideoBuilder;
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
     * @param QueryBuilder $query
     */
    public function newEloquentBuilder($query): PlaylistVideoBuilder
    {
        return new PlaylistVideoBuilder($query);
    }
}
