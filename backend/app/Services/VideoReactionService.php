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
use App\Models\PlaylistVideo;
use App\Models\User;
use App\Models\UserVideoReaction;
use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Support\Facades\DB;

/**
 * VideoReactionService — Handles user reactions and view tracking for videos.
 *
 * Responsible for:
 * - Toggling like/dislike/save reactions
 * - Recording video views
 * - Dispatching reaction events for notifications and analytics
 */
final class VideoReactionService
{
    public function __construct(private readonly ViewCounterService $viewCounter) {}

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

            $likePayload = [
                'user_id' => $user->id,
                'video_id' => $video->id,
                'type' => ReactionType::LIKE->value,
            ];
            $inserted = UserVideoReaction::insertOrIgnore($likePayload);

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

            $dislikePayload = [
                'user_id' => $user->id,
                'video_id' => $video->id,
                'type' => ReactionType::DISLIKE->value,
            ];
            $inserted = UserVideoReaction::insertOrIgnore($dislikePayload);

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

            $playlistVideoPayload = [
                'playlist_id' => $playlist->id,
                'video_id' => $video->id,
            ];
            PlaylistVideo::query()->insert($playlistVideoPayload);

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
            $watchedAt = now();
            // copy() prevents startOfHour() from mutating $watchedAt in-place
            $watchedHour = $watchedAt->copy()->startOfHour();
            $isNotPgsql = DB::connection()->getDriverName() !== 'pgsql';

            // Check dedup before inserting — avoids relying on insertOrIgnore's
            // return value, which can be unreliable through the Eloquent chain.
            $hasViewedThisHour = VideoView::where('user_id', $user->id)
                ->where('video_id', $video->id)
                ->where('watched_hour', $watchedHour)
                ->exists();

            if ($hasViewedThisHour) {
                return;
            }

            $viewRow = [
                'user_id' => $user->id,
                'video_id' => $video->id,
                'watched_at' => $watchedAt,
            ];

            // On PostgreSQL, watched_hour is a GENERATED ALWAYS AS column and
            // must not be set manually. On SQLite (tests), it is a plain nullable
            // column that we populate so the unique constraint can deduplicate.
            if ($isNotPgsql) {
                $viewRow['watched_hour'] = $watchedHour;
            }

            if ($source !== null) {
                $viewRow['source'] = $source->value;
            }

            if ($sessionId !== null) {
                $viewRow['session_id'] = $sessionId;
            }

            VideoView::insertOrIgnore($viewRow);

            $historyRow = [
                'user_id' => $user->id,
                'video_id' => $video->id,
                'watched_at' => $watchedAt,
            ];

            if ($isNotPgsql) {
                $historyRow['watched_hour'] = $watchedHour;
            }

            DB::table('watch_histories')->insertOrIgnore($historyRow);

            $this->viewCounter->increment($video->id);

            event(new VideoViewed($user, $video, $source));
        });
    }
}
