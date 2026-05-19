<?php

namespace App\Services;

use App\Data\CreateVideoData;
use App\Data\EmptyVideoSummary;
use App\Data\FinalizeUploadData;
use App\Data\UpdateVideoData;
use App\Enums\ReactionType;
use App\Enums\VideoEventType;
use App\Enums\VideoStatus;
use App\Events\VideoFinished;
use App\Events\VideoLiked;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Events\VideoViewed;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoSummary;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use TusPhp\Cache\RedisStore as TusRedisStore;

/**
 * VideoService — Business logic for videos.
 *
 * Responsible for:
 * - CRUD operations on videos
 * - Orchestrating related operations
 * - Complex business rules
 */
class VideoService
{
    public function __construct(
        private readonly ViewCounterService $viewCounter,
        private readonly CacheService $cache,
    ) {}

    /**
     * Create a new video.
     *
     * @param  User  $user  Video owner (channel)
     * @param  CreateVideoData  $data  Validated and typed input
     * @return Video Created video
     */
    public function createVideo(User $user, CreateVideoData $data): Video
    {
        return DB::transaction(function () use ($user, $data) {
            $video = Video::create([
                'channel_id' => $user->id,
                'title' => $data->title,
                'description' => $data->description,
                'tags' => $data->tags,
                'status' => VideoStatus::PROCESSING,
                'scheduled_at' => $data->scheduledAt,
            ]);

            $ext = $data->videoFile->getClientOriginalExtension();
            $tmpPath = $data->videoFile->storeAs('uploads/tmp', "{$video->vuid}.{$ext}");

            $tmpThumbPath = null;
            if ($data->thumbnailFile !== null) {
                $thumbExt = $data->thumbnailFile->getClientOriginalExtension();
                $tmpThumbPath = $data->thumbnailFile->storeAs('uploads/tmp', "thumb_{$video->vuid}.{$thumbExt}");
            }

            ProcessVideoUpload::dispatch($video, $tmpPath, $tmpThumbPath)->afterCommit();

            return $video->load('channel');
        });
    }

    /**
     * Finalize a tus resumable upload and create the video record.
     *
     * The tus upload has already completed (all bytes received). This method
     * retrieves the assembled file from tus temporary storage, moves it to the
     * standard uploads/tmp location, creates the Video record with
     * status=PROCESSING, and dispatches ProcessVideoUpload — exactly like
     * createVideo() does for the legacy single-POST path.
     *
     * @param  User  $user  Authenticated channel owner
     * @param  FinalizeUploadData  $data  Validated metadata + upload keys
     * @return Video Freshly created Video (status=PROCESSING)
     *
     * @throws ModelNotFoundException When the upload_key is not found in tus cache
     * @throws \RuntimeException When the assembled file cannot be moved
     */
    public function finalizeUpload(User $user, FinalizeUploadData $data): Video
    {
        $tusCache = new TusRedisStore;
        // TusServer sets prefix via reflection: 'tus:' + strtolower(ShortName) + ':'
        $tusCache->setPrefix('tus:server:');

        $fileMeta = $tusCache->get($data->uploadKey);
        $isFileReady = $fileMeta !== null && isset($fileMeta['file_path']) && file_exists($fileMeta['file_path']);

        if (! $isFileReady) {
            throw new ModelNotFoundException('Upload session not found or file is incomplete.');
        }

        return DB::transaction(function () use ($user, $data, $tusCache, $fileMeta) {
            $video = Video::create([
                'channel_id' => $user->id,
                'title' => $data->title,
                'description' => $data->description,
                'tags' => $data->tags,
                'status' => VideoStatus::PROCESSING,
                'scheduled_at' => $data->scheduledAt,
            ]);

            $rawExt = strtolower(pathinfo((string) ($fileMeta['name'] ?? 'video.mp4'), PATHINFO_EXTENSION));
            $ext = $rawExt !== '' ? $rawExt : 'mp4';
            $tmpPath = "uploads/tmp/{$video->vuid}.{$ext}";
            rename((string) $fileMeta['file_path'], Storage::disk('local')->path($tmpPath));

            $tmpThumbPath = null;
            $hasThumbnailKey = $data->thumbnailKey !== null;

            if ($hasThumbnailKey) {
                $thumbMeta = $tusCache->get($data->thumbnailKey);
                $isThumbReady = $thumbMeta !== null && isset($thumbMeta['file_path']) && file_exists((string) $thumbMeta['file_path']);

                if ($isThumbReady) {
                    $rawThumbExt = strtolower(pathinfo((string) ($thumbMeta['name'] ?? 'thumb.jpg'), PATHINFO_EXTENSION));
                    $thumbExt = $rawThumbExt !== '' ? $rawThumbExt : 'jpg';
                    $tmpThumbPath = "uploads/tmp/thumb_{$video->vuid}.{$thumbExt}";
                    rename((string) $thumbMeta['file_path'], Storage::disk('local')->path($tmpThumbPath));
                    $tusCache->delete($data->thumbnailKey);
                    Cache::forget("tus:owner:{$data->thumbnailKey}");
                }
            }

            ProcessVideoUpload::dispatch($video, $tmpPath, $tmpThumbPath)->afterCommit();

            $tusCache->delete($data->uploadKey);
            Cache::forget("tus:owner:{$data->uploadKey}");

            return $video->load('channel');
        });
    }

    /**
     * Get paginated videos with filters.
     *
     * Caches the default feed (no search/tags/status filters) for 60 seconds.
     *
     * @param  array<string, mixed>  $filters
     */
    public function listVideos(array $filters): LengthAwarePaginator
    {
        $hasFilters = isset($filters['search']) || isset($filters['tags']) || isset($filters['status']);

        if ($hasFilters) {
            return $this->queryVideos($filters);
        }

        $page = (int) ($filters['page'] ?? 1);

        return Cache::tags(['feed'])->remember(
            "feed:page:{$page}",
            60,
            fn () => $this->queryVideos($filters),
        );
    }

    /**
     * Get a specific video by UUID.
     *
     * Result is cached for 300 s with the channel relation eager-loaded so that
     * `VideoResource` can render channel name/id without an extra query.
     *
     * @param  string  $vuid  Video UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getVideoByUuid(string $vuid): Video
    {
        return $this->cache->rememberVideoMeta(
            $vuid,
            fn () => Video::where('vuid', $vuid)->with('channel')->firstOrFail(),
        );
    }

    /**
     * Update a video's metadata.
     *
     * @param  Video  $video  Video to update
     * @param  UpdateVideoData  $data  Validated and typed input
     * @return Video Updated video
     */
    public function updateVideo(Video $video, UpdateVideoData $data): Video
    {
        return DB::transaction(function () use ($video, $data) {
            $video->update($data->toUpdateArray());

            return $video;
        });
    }

    /**
     * Delete a video permanently.
     *
     * The DB record is deleted first inside the transaction. File cleanup runs
     * after the commit so a transaction rollback can never leave the record
     * alive with missing files.
     *
     * @param  Video  $video  Video to delete
     */
    public function deleteVideo(Video $video): void
    {
        $videoPath = $video->video_url;
        $thumbnailPath = $video->thumbnail_url;

        DB::transaction(function () use ($video) {
            $video->delete();
        });

        $this->deleteVideoFiles($videoPath, $thumbnailPath);
    }

    private function deleteVideoFiles(?string $videoPath, ?string $thumbnailPath): void
    {
        foreach ([$videoPath, $thumbnailPath] as $path) {
            if ($path === null) {
                continue;
            }

            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Record a user's view of a video.
     *
     * Deduplicates within the same clock-hour using the unique constraint
     * (user_id, video_id, watched_hour) added to watch_histories. The
     * insertOrIgnore replaces the old SELECT+check pattern, eliminating the
     * race condition where two simultaneous requests both passed the check and
     * both incremented views.
     *
     * @param  User  $user  Who watched
     * @param  Video  $video  What was watched
     * @param  string|null  $source  Surface origin (feed, search, channel, playlist, recommended)
     * @param  string|null  $sessionId  Client session id
     */
    public function recordView(User $user, Video $video, ?string $source = null, ?string $sessionId = null): void
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

            $inserted = DB::table('watch_histories')->insertOrIgnore($row);

            if ($inserted === 0) {
                return;
            }

            $this->viewCounter->increment($video->id);

            event(new VideoViewed($user, $video, $source, $sessionId));
        });
    }

    /**
     * Toggle like status for a video.
     *
     * Uses DELETE-first to avoid the read-then-write race condition. The PK
     * (user_id, video_id) on user_video_reactions guarantees only one reaction
     * row can exist per user+video pair, so concurrent requests serialise via
     * the unique constraint rather than an explicit SELECT.
     *
     * Emits VideoReactionApplied(LIKE) when adding, VideoUnliked when removing,
     * and VideoUndisliked when switching from a previous dislike.
     *
     * @param  User  $user  Who's liking
     * @param  Video  $video  What to like
     */
    public function toggleLike(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $unliked = DB::table('user_video_reactions')
                ->where('user_id', $user->id)
                ->where('video_id', $video->id)
                ->where('type', ReactionType::LIKE->value)
                ->delete();

            if ($unliked > 0) {
                event(new VideoUnliked($user, $video));

                return;
            }

            $wasDisliked = DB::table('user_video_reactions')
                ->where('user_id', $user->id)
                ->where('video_id', $video->id)
                ->where('type', ReactionType::DISLIKE->value)
                ->delete();

            if ($wasDisliked > 0) {
                event(new VideoUndisliked($user, $video));
            }

            $inserted = DB::table('user_video_reactions')->insertOrIgnore([
                'user_id' => $user->id,
                'video_id' => $video->id,
                'type' => ReactionType::LIKE->value,
            ]);

            if ($inserted > 0) {
                event(new VideoReactionApplied($user, $video, VideoEventType::LIKE));
                $likeCount = DB::table('user_video_reactions')
                    ->where('video_id', $video->id)
                    ->where('type', ReactionType::LIKE->value)
                    ->count();
                event(new VideoLiked($video, $user, $likeCount));
            }
        });
    }

    /**
     * Toggle dislike status for a video.
     *
     * Uses DELETE-first to avoid the read-then-write race condition. Symmetric
     * with toggleLike — see that method for the concurrency rationale.
     *
     * Emits VideoReactionApplied(DISLIKE) when adding, VideoUndisliked when
     * removing, and VideoUnliked when switching from a previous like.
     *
     * @param  User  $user  Who's disliking
     * @param  Video  $video  What to dislike
     */
    public function toggleDislike(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $undisliked = DB::table('user_video_reactions')
                ->where('user_id', $user->id)
                ->where('video_id', $video->id)
                ->where('type', ReactionType::DISLIKE->value)
                ->delete();

            if ($undisliked > 0) {
                event(new VideoUndisliked($user, $video));

                return;
            }

            $wasLiked = DB::table('user_video_reactions')
                ->where('user_id', $user->id)
                ->where('video_id', $video->id)
                ->where('type', ReactionType::LIKE->value)
                ->delete();

            if ($wasLiked > 0) {
                event(new VideoUnliked($user, $video));
            }

            $inserted = DB::table('user_video_reactions')->insertOrIgnore([
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
     * Toggle save status for a video (add/remove from Watch Later playlist).
     *
     * Uses DELETE-first to avoid the read-then-write race condition: two
     * simultaneous saves would previously both read "not saved" and both
     * attach, producing a duplicate pivot row. Now the first DELETE wins.
     *
     * Emits VideoSaved when adding, VideoUnsaved when removing.
     *
     * @param  User  $user  Who's saving
     * @param  Video  $video  What to save
     */
    public function toggleSave(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $playlist = $user->getWatchLaterPlaylist();

            $removed = DB::table('playlist_video')
                ->where('playlist_id', $playlist->id)
                ->where('video_id', $video->id)
                ->delete();

            if ($removed > 0) {
                event(new VideoUnsaved($user, $video));

                return;
            }

            DB::table('playlist_video')->insertOrIgnore([
                'playlist_id' => $playlist->id,
                'video_id' => $video->id,
                'position' => 0,
            ]);

            event(new VideoSaved($user, $video));
        });
    }

    /**
     * Update user's watch progress for a video.
     *
     * Emits VideoFinished only on the FIRST crossing of the 95% threshold,
     * to avoid duplicate finish events when the user re-watches the tail.
     *
     * @param  User  $user  Who's watching
     * @param  Video  $video  What's being watched
     * @param  int  $percent  Progress percentage (0-100)
     */
    public function updateProgress(User $user, Video $video, int $percent): void
    {
        DB::transaction(function () use ($user, $video, $percent) {
            $existing = $user->progress()
                ->where('video_id', $video->id)
                ->lockForUpdate()
                ->first();

            $previousPercent = $existing !== null ? $existing->percent : 0;

            $user->progress()->updateOrCreate(
                ['video_id' => $video->id],
                ['percent' => $percent],
            );

            $isFirstFinish = $previousPercent < 95 && $percent >= 95;

            if ($isFirstFinish) {
                event(new VideoFinished($user, $video));
            }
        });
    }

    /**
     * Publish all scheduled videos whose scheduled_at has passed.
     *
     * @return int Number of videos published
     */
    public function publishDueVideos(): int
    {
        return Video::query()
            ->where('status', VideoStatus::SCHEDULED)
            ->where('scheduled_at', '<=', now())
            ->update([
                'status' => VideoStatus::PUBLISHED,
                'published_at' => DB::raw('scheduled_at'),
                'updated_at' => now(),
            ]);
    }

    /**
     * Get AI-generated summary for a video.
     *
     * Caches the summary forever once generated (it is immutable). Does not cache
     * null so the result appears immediately after the AI finishes without waiting
     * for a TTL to expire.
     *
     * @param  Video  $video  Video to get summary for
     * @return VideoSummary|EmptyVideoSummary Summary with keyPoints, chapters, readingMode
     */
    public function getSummary(Video $video): VideoSummary|EmptyVideoSummary
    {
        $summary = $this->cache->getOrCacheVideoSummary(
            $video->vuid,
            fn () => $video->summary,
        );

        return $summary !== null ? $summary : new EmptyVideoSummary;
    }

    /**
     * Execute the base video query with filters applied.
     *
     * @param  array<string, mixed>  $filters
     */
    private function queryVideos(array $filters): LengthAwarePaginator
    {
        $hasStatusFilter = isset($filters['status']);
        $query = Video::filter($filters)->with('channel');

        if (! $hasStatusFilter) {
            $query = $query->published();
        }

        return $query->paginate(15);
    }
}
