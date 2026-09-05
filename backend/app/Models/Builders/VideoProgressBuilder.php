<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\VideoProgress;
use Illuminate\Database\Eloquent\Builder;

/**
 * @extends Builder<VideoProgress>
 */
class VideoProgressBuilder extends Builder
{
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }
}
