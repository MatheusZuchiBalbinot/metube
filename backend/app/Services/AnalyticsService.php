<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\VideoSource;
use App\Events\SearchPerformed;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoImpressionsBatch;
use App\Events\VideoSkipped;
use App\Models\User;
use App\Models\Video;

/**
 * AnalyticsService — Dispatches client-reported user events.
 *
 * The frontend reports impressions, clicks, searches and skips through this
 * service so the recommendation pipeline gets the implicit signals it needs.
 */
final class AnalyticsService
{
    /**
     * Emits a single VideoImpressionsBatch event instead of one event per video,
     * so the listener can bulk-insert all rows in one query.
     *
     * @param list<string> $vuids Video UUIDs in render order
     */
    public function recordImpressions(User $user, array $vuids, VideoSource $source, ?string $sessionId = null): void
    {
        /** @var array<string, int> $idByVuid */
        $idByVuid = Video::whereIn('vuid', $vuids)->pluck('id', 'vuid')->all();

        $items = [];

        foreach ($vuids as $position => $vuid) {
            if (!isset($idByVuid[$vuid])) {
                continue;
            }

            $impressionData = [
                'video_id' => $idByVuid[$vuid],
                'position' => $position,
            ];
            $items[] = $impressionData;
        }

        if ($items === []) {
            return;
        }

        event(new VideoImpressionsBatch($user, $items, $source, $sessionId));
    }

    public function recordClick(
        User $user,
        Video $video,
        VideoSource $source,
        ?int $position = null,
        ?string $sessionId = null,
    ): void {
        event(new VideoClickedFromFeed($user, $video, $source, $position, $sessionId));
    }

    public function recordSearch(User $user, string $query, int $resultCount, ?string $sessionId = null): void
    {
        event(new SearchPerformed($user, $query, $resultCount, $sessionId));
    }

    /**
     * @param int $percent Watch progress at the moment of skip (0-100)
     */
    public function recordSkip(User $user, Video $video, int $percent): void
    {
        event(new VideoSkipped($user, $video, $percent));
    }
}
