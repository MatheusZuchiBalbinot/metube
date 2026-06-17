<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Enums\ReactionType;
use App\Models\UserVideoReaction;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the UserVideoReaction model.
 *
 * Replaces the former query scopes with typed, chainable methods while keeping
 * full static analysis support under PHPStan level 8.
 *
 * @extends Builder<UserVideoReaction>
 */
class UserVideoReactionBuilder extends Builder
{
    /**
     * Filter reactions by user.
     *
     * @param int $userId User ID
     */
    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    /**
     * Filter reactions for a video.
     *
     * @param int $videoId Video ID
     */
    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    /**
     * Filter reactions of a specific type.
     *
     * @param string $type Reaction type (LIKE, DISLIKE)
     */
    public function ofType(string $type): self
    {
        return $this->where('type', $type);
    }

    /**
     * Filter like reactions only.
     */
    public function likes(): self
    {
        return $this->where('type', ReactionType::LIKE->value);
    }

    /**
     * Filter dislike reactions only.
     */
    public function dislikes(): self
    {
        return $this->where('type', ReactionType::DISLIKE->value);
    }
}
