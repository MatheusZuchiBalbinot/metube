<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

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

    /**
     * Get the playlist this entry belongs to.
     *
     * @return BelongsTo<Playlist, $this>
     */
    public function playlist(): BelongsTo
    {
        return $this->belongsTo(Playlist::class);
    }

    /**
     * Get the video this entry belongs to.
     *
     * @return BelongsTo<Video, $this>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}
