<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\VideoView;
use Illuminate\Database\Eloquent\Builder;

/**
 * @extends Builder<VideoView>
 */
class VideoViewBuilder extends Builder
{
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    public function withSource(string $source): self
    {
        return $this->where('source', $source);
    }

    public function withSession(string $sessionId): self
    {
        return $this->where('session_id', $sessionId);
    }
}
