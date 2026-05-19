<?php

namespace App\Services;

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
class AnalyticsService
{
    /**
     * Record that a list of videos was rendered to the user (impressions).
     *
     * Emits a single VideoImpressionsBatch event instead of one event per video,
     * so the listener can bulk-insert all rows in one query.
     *
     * @param  User  $user  Who saw the impressions
     * @param  list<string>  $vuids  Video UUIDs in render order
     * @param  string  $source  Surface origin (feed, search, channel, recommended)
     * @param  string|null  $sessionId  Client session id
     */
    public function recordImpressions(User $user, array $vuids, string $source, ?string $sessionId = null): void
    {
        /** @var array<string, int> $idByVuid */
        $idByVuid = Video::whereIn('vuid', $vuids)->pluck('id', 'vuid')->all();

        $items = [];

        foreach ($vuids as $position => $vuid) {
            if (! isset($idByVuid[$vuid])) {
                continue;
            }

            $items[] = ['video_id' => $idByVuid[$vuid], 'position' => $position];
        }

        if ($items === []) {
            return;
        }

        event(new VideoImpressionsBatch($user, $items, $source, $sessionId));
    }

    /**
     * Record that the user clicked a video from a feed.
     *
     * @param  User  $user  Who clicked
     * @param  Video  $video  What was clicked
     * @param  string  $source  Surface origin (feed, search, channel, recommended)
     * @param  int|null  $position  Render position when clicked
     * @param  string|null  $sessionId  Client session id
     */
    public function recordClick(User $user, Video $video, string $source, ?int $position = null, ?string $sessionId = null): void
    {
        event(new VideoClickedFromFeed($user, $video, $source, $position, $sessionId));
    }

    /**
     * Record that the user performed a search query.
     *
     * @param  User  $user  Who searched
     * @param  string  $query  Raw query text
     * @param  int  $resultCount  How many results were returned
     * @param  string|null  $sessionId  Client session id
     */
    public function recordSearch(User $user, string $query, int $resultCount, ?string $sessionId = null): void
    {
        event(new SearchPerformed($user, $query, $resultCount, $sessionId));
    }

    /**
     * Record that the user abandoned a video early.
     *
     * @param  User  $user  Who skipped
     * @param  Video  $video  What was skipped
     * @param  int  $percent  Watch progress at the moment of skip (0-100)
     */
    public function recordSkip(User $user, Video $video, int $percent): void
    {
        event(new VideoSkipped($user, $video, $percent));
    }
}
