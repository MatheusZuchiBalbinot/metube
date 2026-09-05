<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\Comment;
use Illuminate\Database\Eloquent\Builder;

/**
 * @extends Builder<Comment>
 */
class CommentBuilder extends Builder
{
    public function topLevel(): self
    {
        return $this->whereNull('parent_id');
    }

    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    public function byCuid(string $cuid): self
    {
        return $this->where('cuid', $cuid);
    }

    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function repliesTo(int $parentId): self
    {
        return $this->where('parent_id', $parentId);
    }

    /**
     * Counterpart to Eloquent's native oldest(); kept as a named method so call
     * sites read symmetrically (->newest() / ->oldest()).
     */
    public function newest(): self
    {
        return $this->orderByDesc('created_at');
    }
}
