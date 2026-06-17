<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\VideoView;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the VideoView model.
 *
 * Replaces the former query scopes with typed, chainable methods while keeping
 * full static analysis support under PHPStan level 8.
 *
 * @extends Builder<VideoView>
 */
class VideoViewBuilder extends Builder
{
    /**
     * Filter views by user.
     *
     * @param int $userId User ID
     */
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    /**
     * Filter views for a video.
     *
     * @param int $videoId Video ID
     */
    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    /**
     * Filter views by their source.
     *
     * @param string $source View source
     */
    public function withSource(string $source): self
    {
        return $this->where('source', $source);
    }

    /**
     * Filter views by session identifier.
     *
     * @param string $sessionId Session ID
     */
    public function withSession(string $sessionId): self
    {
        return $this->where('session_id', $sessionId);
    }
}
