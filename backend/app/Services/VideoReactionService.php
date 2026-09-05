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
use App\Models\WatchHistory;
use App\Support\CacheKeys;
use App\Support\ToggleGuard;
use App\Support\ToggleOutcome;
use Carbon\CarbonInterface;
use Closure;
use Illuminate\Support\Facades\DB;

/**
 * VideoReactionService — Handles user reactions and view tracking for videos.
 */
final class VideoReactionService
{
    public function __construct(
        private readonly ViewCounterService $viewCounter,
        private readonly CacheService $cache,
    ) {}

    /**
     * Fires VideoLiked with the fresh like count — the one behavior that is
     * NOT shared with toggleDislike.
     */
    public function toggleLike(User $user, Video $video): void
    {
        $this->toggleReaction($user, $video, ReactionType::LIKE, function () use ($user, $video): void {
            $likeCount = UserVideoReaction::query()->forVideo($video->id)->likes()->count();
            event(new VideoLiked($video, $user, $likeCount));
        });
    }

    public function toggleDislike(User $user, Video $video): void
    {
        $this->toggleReaction($user, $video, ReactionType::DISLIKE);
    }

    /**
     * Shared toggle logic for like/dislike reactions.
     *
     * Delete-first avoids the read-then-write race: two simultaneous clicks
     * would otherwise both read "not reacted" and both attempt to insert,
     * tripping the unique constraint. The first DELETE wins and the request
     * becomes an "un-react"; otherwise any opposite reaction is removed
     * (like/dislike are mutually exclusive) before the new one is inserted.
     *
     * insertOrIgnore's return value is checked so a second concurrent
     * request — whose own DELETE found nothing, same as the first — never
     * fires a duplicate VideoReactionApplied/onApplied for a row it didn't
     * actually create.
     *
     * @param Closure(): void|null $onApplied Extra side effect run only when a new
     *                                        reaction row was actually inserted — e.g. toggleLike's VideoLiked with a
     *                                        fresh count. Null for reactions with no such extra behavior.
     */
    private function toggleReaction(User $user, Video $video, ReactionType $type, ?Closure $onApplied = null): void
    {
        DB::transaction(function () use ($user, $video, $type, $onApplied): void {
            $oppositeType = $type->opposite();

            $outcome = ToggleGuard::run(
                delete: fn (): int => UserVideoReaction::query()->byUser($user->id)
                    ->forVideo($video->id)
                    ->ofType($type->value)
                    ->delete(),
                insert: function () use ($user, $video, $type, $oppositeType): int {
                    $oppositeRemoved = UserVideoReaction::query()->byUser($user->id)
                        ->forVideo($video->id)
                        ->ofType($oppositeType->value)
                        ->delete();

                    if ($oppositeRemoved > 0) {
                        event($this->unReactedEvent($oppositeType, $user, $video));
                    }

                    return UserVideoReaction::insertOrIgnore([
                        'user_id' => $user->id,
                        'video_id' => $video->id,
                        'type' => $type->value,
                    ]);
                },
            );

            if ($outcome === ToggleOutcome::Removed) {
                event($this->unReactedEvent($type, $user, $video));

                return;
            }

            // NoOp: a concurrent request already applied this reaction — skip the side effects.
            if ($outcome === ToggleOutcome::NoOp) {
                return;
            }

            event(new VideoReactionApplied($user, $video, $this->reactionEventType($type)));

            if ($onApplied === null) {
                return;
            }

            $onApplied();
        });
    }

    private function unReactedEvent(ReactionType $type, User $user, Video $video): VideoUnliked|VideoUndisliked
    {
        return match ($type) {
            ReactionType::LIKE => new VideoUnliked($user, $video),
            ReactionType::DISLIKE => new VideoUndisliked($user, $video),
        };
    }

    private function reactionEventType(ReactionType $type): VideoEventType
    {
        return match ($type) {
            ReactionType::LIKE => VideoEventType::LIKE,
            ReactionType::DISLIKE => VideoEventType::DISLIKE,
        };
    }

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
     * Uses a 60-second cache-backed throttle to dedupe rapid repeat views per
     * user per video. The watched_hour uniqueness constraint on video_views
     * is a separate, coarser safety net (hourly, not 60s) for concurrent
     * edge cases — so insertOrIgnore's return is checked and the views
     * counter is only bumped when a row was actually inserted; otherwise
     * `videos.views` would keep counting views the DB itself deduped away.
     *
     * The counter increment is deferred to DB::afterCommit so a rollback of
     * this transaction never leaves a Redis-buffered increment stranded
     * with no matching video_views row.
     */
    public function recordView(User $user, Video $video, ?VideoSource $source = null, ?string $sessionId = null): void
    {
        $throttleKey = CacheKeys::viewThrottle($video->id, $user->id);
        $isThrottled = !$this->cache->throttle($throttleKey, 60);

        if ($isThrottled) {
            return;
        }

        DB::transaction(function () use ($user, $video, $source, $sessionId) {
            $watchedAt = now();
            // copy() prevents startOfHour() from mutating $watchedAt in-place
            $watchedHour = $watchedAt->copy()->startOfHour();
            $isNotPgsql = DB::connection()->getDriverName() !== 'pgsql';

            $viewRow = $this->withWatchedHour([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'watched_at' => $watchedAt,
            ], $watchedHour, $isNotPgsql);

            if ($source !== null) {
                $viewRow['source'] = $source->value;
            }

            if ($sessionId !== null) {
                $viewRow['session_id'] = $sessionId;
            }

            $inserted = VideoView::insertOrIgnore($viewRow);

            if ($inserted === 0) {
                return;
            }

            $historyRow = $this->withWatchedHour([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'watched_at' => $watchedAt,
            ], $watchedHour, $isNotPgsql);

            WatchHistory::insertOrIgnore($historyRow);

            DB::afterCommit(fn () => $this->viewCounter->increment($video->id));

            event(new VideoViewed($user, $video, $source));
        });
    }

    /**
     * Add watched_hour to a video_views/watch_histories row when needed.
     *
     * On PostgreSQL, watched_hour is a GENERATED ALWAYS AS column and must
     * not be set manually. On SQLite (tests), it is a plain nullable column
     * that must be populated so the unique constraint can deduplicate.
     *
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private function withWatchedHour(array $row, CarbonInterface $watchedHour, bool $isNotPgsql): array
    {
        if ($isNotPgsql) {
            $row['watched_hour'] = $watchedHour;
        }

        return $row;
    }
}
