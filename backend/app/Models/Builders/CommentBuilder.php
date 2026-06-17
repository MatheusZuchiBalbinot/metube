<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\Comment;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the Comment model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language (Comment::query()->topLevel()->newest()) while keeping
 * full static analysis support under PHPStan level 8.
 *
 * @extends Builder<Comment>
 */
class CommentBuilder extends Builder
{
    /**
     * Restrict the query to top-level comments (no parent).
     */
    public function topLevel(): self
    {
        return $this->whereNull('parent_id');
    }

    /**
     * Restrict the query to comments for a specific video.
     *
     * @param int $videoId Video ID
     */
    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    /**
     * Filter a comment by its public CUID.
     *
     * @param string $cuid Comment unique ID
     */
    public function byCuid(string $cuid): self
    {
        return $this->where('cuid', $cuid);
    }

    /**
     * Restrict the query to comments by a specific user.
     *
     * @param int $userId User ID
     */
    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    /**
     * Restrict the query to replies to a specific comment.
     *
     * @param int $parentId Parent comment ID
     */
    public function repliesTo(int $parentId): self
    {
        return $this->where('parent_id', $parentId);
    }

    /**
     * Order comments by creation date, newest first.
     *
     * Counterpart to Eloquent's native oldest(); kept as a named method so call
     * sites read symmetrically (->newest() / ->oldest()).
     */
    public function newest(): self
    {
        return $this->orderByDesc('created_at');
    }
}
