<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\VideoProgress;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the VideoProgress model.
 *
 * Replaces the former query scopes with typed, chainable methods while keeping
 * full static analysis support under PHPStan level 8.
 *
 * @extends Builder<VideoProgress>
 */
class VideoProgressBuilder extends Builder
{
    /**
     * Filter progress by user.
     *
     * @param int $userId User ID
     */
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    /**
     * Filter progress by video.
     *
     * @param int $videoId Video ID
     */
    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }
}
