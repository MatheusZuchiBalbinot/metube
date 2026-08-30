<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for events that should be persisted to user_analytics.
 *
 * The LogUserAnalytic listener inserts the returned row as-is, so the
 * shape must match the user_analytics fillable fields.
 */
interface LoggableUserEvent
{
    /**
     * Expected keys:
     * - user_id     int       Required. Who triggered the event.
     * - event_type  string    Required. VideoEventType value.
     * - video_id    int|null  Optional. Target video.
     * - channel_id  int|null  Optional. Target channel.
     * - source      string|null Optional. Surface origin (feed, search, channel, playlist, recommended).
     * - session_id  string|null Optional. Client session id.
     * - payload     array<string,mixed>|null Optional. Free-form context (percent, position, query, ...).
     *
     * @return array<string, mixed>
     */
    public function toAnalyticRow(): array;
}
