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
    public function forPlaylist(int $playlistId): self
    {
        return $this->where('playlist_id', $playlistId);
    }

    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    public function ordered(): self
    {
        return $this->orderBy('position');
    }
}
