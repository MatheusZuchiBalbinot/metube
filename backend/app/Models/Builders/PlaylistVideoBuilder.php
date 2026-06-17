<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\PlaylistVideo;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the PlaylistVideo pivot model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language while keeping full static analysis support under
 * PHPStan level 8.
 *
 * @extends Builder<PlaylistVideo>
 */
class PlaylistVideoBuilder extends Builder
{
    /**
     * Filter rows belonging to a specific playlist.
     *
     * @param int $playlistId Playlist ID
     */
    public function forPlaylist(int $playlistId): self
    {
        return $this->where('playlist_id', $playlistId);
    }

    /**
     * Filter rows referencing a specific video.
     *
     * @param int $videoId Video ID
     */
    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    /**
     * Order rows by their position within the playlist.
     */
    public function ordered(): self
    {
        return $this->orderBy('position');
    }
}
