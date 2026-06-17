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
    /**
     * Filter history by user.
     *
     * @param int $userId User ID
     */
    public function forUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    /**
     * Filter history for a video.
     *
     * @param int $videoId Video ID
     */
    public function forVideo(int $videoId): self
    {
        return $this->where('video_id', $videoId);
    }

    /**
     * Restrict history to the most recent days.
     *
     * @param int $days Number of days back to include
     */
    public function recentDays(int $days = 30): self
    {
        return $this->where('watched_at', '>=', now()->subDays($days));
    }

    /**
     * Filter history by video VUID using a joined query.
     *
     * @param string $vuid Video VUID
     */
    public function byVideoVuid(string $vuid): self
    {
        return $this->whereHas('video', fn ($q) => $q->where('vuid', $vuid));
    }

    /**
     * Restrict history to a time window. HistoryPeriod::ALL applies no constraint.
     *
     * @param HistoryPeriod $period Time window to filter by
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
