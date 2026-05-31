<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ReactionType;
use App\Enums\VideoEventType;
use App\Enums\VideoSource;
use App\Events\VideoLiked;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Events\VideoViewed;
use App\Models\User;
use App\Models\UserVideoReaction;
use App\Models\PlaylistVideo;
use App\Models\VideoView;
use App\Models\Video;
use Illuminate\Support\Facades\DB;

/**
 * VideoReactionService — Handles user reactions and view tracking for videos.
 *
 * Responsible for:
 * - Toggling like/dislike/save reactions
 * - Recording video views
 * - Dispatching reaction events for notifications and analytics
 */
class VideoReactionService
{
    /**
     * Toggle like reaction on a video.
     *
     * Removes existing like if present, otherwise removes dislike (if any)
     * and creates a like reaction.
     *
     * @param User $user Authenticated user
     * @param Video $video Video to like/unlike
     */
    public function toggleLike(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $unliked = UserVideoReaction::byUser($user->id)
                ->forVideo($video->id)
                ->likes()
                ->delete();

            if ($unliked > 0) {
                event(new VideoUnliked($user, $video));

                return;
            }

            $wasDisliked = UserVideoReaction::byUser($user->id)
                ->forVideo($video->id)
                ->dislikes()
                ->delete();

            if ($wasDisliked > 0) {
                event(new VideoUndisliked($user, $video));
            }

            $inserted = UserVideoReaction::insertOrIgnore([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'type' => ReactionType::LIKE->value,
            ]);

            if ($inserted > 0) {
                event(new VideoReactionApplied($user, $video, VideoEventType::LIKE));
                $likeCount = UserVideoReaction::forVideo($video->id)
                    ->likes()
                    ->count();
                event(new VideoLiked($video, $user, $likeCount));
            }
        });
    }

    /**
     * Toggle dislike reaction on a video.
     *
     * Removes existing dislike if present, otherwise removes like (if any)
     * and creates a dislike reaction.
     *
     * @param User $user Authenticated user
     * @param Video $video Video to dislike/undislike
     */
    public function toggleDislike(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $undisliked = UserVideoReaction::byUser($user->id)
                ->forVideo($video->id)
                ->dislikes()
                ->delete();

            if ($undisliked > 0) {
                event(new VideoUndisliked($user, $video));

                return;
            }

            $wasLiked = UserVideoReaction::byUser($user->id)
                ->forVideo($video->id)
                ->likes()
                ->delete();

            if ($wasLiked > 0) {
                event(new VideoUnliked($user, $video));
            }

            $inserted = UserVideoReaction::insertOrIgnore([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'type' => ReactionType::DISLIKE->value,
            ]);

            if ($inserted > 0) {
                event(new VideoReactionApplied($user, $video, VideoEventType::DISLIKE));
            }
        });
    }

    /**
     * Toggle save reaction on a video (adds/removes from watch later).
     *
     * @param User $user Authenticated user
     * @param Video $video Video to save/unsave
     */
    public function toggleSave(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $playlist = $user->getWatchLaterPlaylist();

            $removed = PlaylistVideo::query()
                ->forPlaylist($playlist->id)
                ->forVideo($video->id)
                ->delete();

            if ($removed > 0) {
                $playlist->touch();
                event(new VideoUnsaved($user, $video));

                return;
            }

            PlaylistVideo::query()->insert([
                'playlist_id' => $playlist->id,
                'video_id' => $video->id,
            ]);

            $playlist->touch();
            event(new VideoSaved($user, $video));
        });
    }

    /**
     * Record a video view for a user.
     *
     * Tracks watching to avoid duplicate impressions within an hour.
     * On PostgreSQL, the watched_hour is auto-generated; on SQLite (tests),
     * we populate it manually for deduplication.
     *
     * @param User $user Authenticated user
     * @param Video $video Video being watched
     * @param VideoSource|null $source Optional source of the view (e.g., feed, search, recommendation)
     * @param string|null $sessionId Optional session identifier for grouping views
     */
    public function recordView(User $user, Video $video, ?VideoSource $source = null, ?string $sessionId = null): void
    {
        DB::transaction(function () use ($user, $video, $source, $sessionId) {
            $now = now();

            $row = [
                'user_id' => $user->id,
                'video_id' => $video->id,
                'watched_at' => $now,
            ];

            // On PostgreSQL, watched_hour is a GENERATED ALWAYS AS column and
            // must not be set manually. On SQLite (tests), it is a plain nullable
            // column that we populate so the unique constraint can deduplicate.
            if (DB::connection()->getDriverName() !== 'pgsql') {
                $row['watched_hour'] = $now->startOfHour();
            }

            if ($source !== null) {
                $row['source'] = $source->value;
            }

            if ($sessionId !== null) {
                $row['session_id'] = $sessionId;
            }

            VideoView::insertOrIgnore($row);

            event(new VideoViewed($user, $video, $source));
        });
    }
}
