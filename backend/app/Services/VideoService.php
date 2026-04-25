<?php

namespace App\Services;

use App\Enums\VideoStatus;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
    /**
     * Create a new video.
     *
     * @param  User  $user  Video owner (channel)
     * @param  array<string, mixed>  $data  Validated data
     * @return Video Created video
     */
    public function createVideo(User $user, array $data): Video
    {
        return DB::transaction(function () use ($user, $data) {
            $video = Video::create([
                'channel_id'   => $user->id,
                'title'        => $data['title'],
                'description'  => $data['description'] ?? null,
                'tags'         => $data['tags'] ?? [],
                'status'       => VideoStatus::PROCESSING,
                'scheduled_at' => $data['scheduled_at'] ?? null,
            ]);

            /** @var \Illuminate\Http\UploadedFile $videoFile */
            $videoFile = $data['video_file'];
            $ext = $videoFile->getClientOriginalExtension();
            $tmpPath = $videoFile->storeAs('uploads/tmp', "{$video->vuid}.{$ext}");

            $tmpThumbPath = null;
            if (isset($data['thumbnail_file'])) {
                /** @var \Illuminate\Http\UploadedFile $thumbFile */
                $thumbFile = $data['thumbnail_file'];
                $thumbExt = $thumbFile->getClientOriginalExtension();
                $tmpThumbPath = $thumbFile->storeAs('uploads/tmp', "thumb_{$video->vuid}.{$thumbExt}");
            }

            ProcessVideoUpload::dispatch($video, $tmpPath, $tmpThumbPath);

            return $video->load('channel');
        });
    }

    /**
     * Get paginated videos with filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function listVideos(array $filters): LengthAwarePaginator
    {
        return Video::filter($filters)->paginate(15);
    }

    /**
     * Get a specific video by UUID.
     *
     * @param  string  $vuid  Video UUID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getVideoByUuid(string $vuid): Video
    {
        return Video::where('vuid', $vuid)->firstOrFail();
    }

    /**
     * Update a video's metadata.
     *
     * @param  Video  $video  Video to update
     * @param  array<string, mixed>  $data  Validated data
     * @return Video Updated video
     */
    public function updateVideo(Video $video, array $data): Video
    {
        return DB::transaction(function () use ($video, $data) {
            $video->update(array_filter($data, fn ($v) => $v !== null));

            return $video;
        });
    }

    /**
     * Delete a video permanently.
     *
     * @param  Video  $video  Video to delete
     */
    public function deleteVideo(Video $video): void
    {
        DB::transaction(function () use ($video) {
            $this->deleteVideoFiles($video);
            $video->delete();
        });
    }

    /**
     * @param  Video  $video
     */
    private function deleteVideoFiles(Video $video): void
    {
        foreach (['video_url', 'thumbnail_url'] as $field) {
            $url = $video->$field;

            if ($url === null) {
                continue;
            }

            // Stored as root-relative path: /storage/videos/{file}
            $path = ltrim(str_replace('/storage/', '', $url), '/');
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Record a user's view of a video.
     *
     * @param  User  $user  Who watched
     * @param  Video  $video  What was watched
     */
    public function recordView(User $user, Video $video): void
    {
        DB::transaction(function () use ($user, $video) {
            $video->increment('views');
            $user->history()->create(['video_id' => $video->id]);
        });
    }

    /**
     * Toggle like status for a video.
     *
     * @param  User  $user  Who's liking
     * @param  Video  $video  What to like
     */
    public function toggleLike(User $user, Video $video): void
    {
        if ($user->likes()->where('video_id', $video->id)->exists()) {
            $user->reactions()->detach($video->id);
        } else {
            $user->dislikes()->detach($video->id);
            $user->reactions()->attach($video->id, ['type' => 'like']);
        }
    }

    /**
     * Toggle dislike status for a video.
     *
     * @param  User  $user  Who's disliking
     * @param  Video  $video  What to dislike
     */
    public function toggleDislike(User $user, Video $video): void
    {
        if ($user->dislikes()->where('video_id', $video->id)->exists()) {
            $user->reactions()->detach($video->id);
        } else {
            $user->likes()->detach($video->id);
            $user->reactions()->attach($video->id, ['type' => 'dislike']);
        }
    }

    /**
     * Toggle save status for a video (add/remove from Watch Later playlist).
     *
     * @param  User  $user  Who's saving
     * @param  Video  $video  What to save
     */
    public function toggleSave(User $user, Video $video): void
    {
        $playlist = $user->getWatchLaterPlaylist();

        if ($playlist->videos()->where('video_id', $video->id)->exists()) {
            $playlist->videos()->detach($video->id);
        } else {
            $playlist->videos()->attach($video->id, ['position' => 0]);
        }
    }

    /**
     * Update user's watch progress for a video.
     *
     * @param  User  $user  Who's watching
     * @param  Video  $video  What's being watched
     * @param  int  $percent  Progress percentage (0-100)
     */
    public function updateProgress(User $user, Video $video, int $percent): void
    {
        $user->progress()->updateOrCreate(
            ['video_id' => $video->id],
            ['percent' => $percent],
        );
    }

    /**
     * Get AI-generated summary for a video.
     *
     * @param  Video  $video  Video to get summary for
     * @return \App\Models\VideoSummary|object Summary with keyPoints, chapters, readingMode
     */
    public function getSummary(Video $video)
    {
        $summary = $video->summary;

        if ($summary === null) {
            // TODO: Implement AI summary generation
            return (object) [
                'keyPoints' => [],
                'chapters' => [],
                'readingMode' => '',
            ];
        }

        return $summary;
    }
}
