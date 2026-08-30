<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\UserSubscription;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the UserSubscription model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language while keeping full static analysis support under
 * PHPStan level 8.
 *
 * @extends Builder<UserSubscription>
 */
class UserSubscriptionBuilder extends Builder
{
    public function byUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function toChannel(int $channelId): self
    {
        return $this->where('channel_id', $channelId);
    }

    public function fromUserToChannel(int $userId, int $channelId): self
    {
        return $this->where('user_id', $userId)->where('channel_id', $channelId);
    }
}
