<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Enums\VideoEventType;
use App\Models\UserAnalytic;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the UserAnalytic model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language while keeping full static analysis support under
 * PHPStan level 8.
 *
 * @extends Builder<UserAnalytic>
 */
class UserAnalyticBuilder extends Builder
{
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function recentDays(int $days = 30): self
    {
        return $this->where('occurred_at', '>=', now()->subDays($days));
    }

    public function ofType(VideoEventType $eventType): self
    {
        return $this->where('event_type', $eventType);
    }
}
