<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\PlaylistVideo;
use Illuminate\Database\Eloquent\Builder;

/**
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
