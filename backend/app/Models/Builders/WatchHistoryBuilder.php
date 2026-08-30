<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Enums\HistoryPeriod;
use App\Models\WatchHistory;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the WatchHistory model.
 *
 * Replaces the former query scopes with typed, chainable methods while keeping
 * full static analysis support under PHPStan level 8.
 *
 * @extends Builder<WatchHistory>
 */
class WatchHistoryBuilder extends Builder
{
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    public function recentDays(int $days = 30): self
    {
        return $this->where('watched_at', '>=', now()->subDays($days));
    }

    public function byVideoVuid(string $vuid): self
    {
        return $this->whereHas('video', fn ($q) => $q->where('vuid', $vuid));
    }

    /**
     * HistoryPeriod::ALL applies no constraint.
     */
    public function filterByPeriod(HistoryPeriod $period): self
    {
        $startDate = $period->startDate();

        if ($startDate === null) {
            return $this;
        }

        return $this->where('watched_at', '>=', $startDate);
    }
}
