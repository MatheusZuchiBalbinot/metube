<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Enums\ReactionType;
use App\Models\UserVideoReaction;
use Illuminate\Database\Eloquent\Builder;

/**
 * @extends Builder<UserVideoReaction>
 */
class UserVideoReactionBuilder extends Builder
{
    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    public function ofType(string $type): self
    {
        return $this->where('type', $type);
    }

    public function likes(): self
    {
        return $this->where('type', ReactionType::LIKE->value);
    }

    public function dislikes(): self
    {
        return $this->where('type', ReactionType::DISLIKE->value);
    }
}
