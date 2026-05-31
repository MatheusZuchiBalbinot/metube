<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Enums\VideoStatus;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use TusPhp\Cache\RedisStore as TusRedisStore;

/**
 * VideoUploadService — Handles video upload and deletion workflows.
 *
 * Responsible for:
 * - Creating new videos from single-POST uploads
 * - Finalizing tus resumable uploads
 * - Deleting videos and their associated files
 */
class VideoUploadService
{
    public function __construct(private readonly CacheService $cache) {}

    /**
     * Create a new video from a direct file upload.
     *
     * @param User $user Video owner (channel)
     * @param CreateVideoDTO $data Validated video metadata and files
     *
     * @return Video Created video with status=PROCESSING
     */
    public function createVideo(User $user, CreateVideoDTO $data): Video
    {
        return DB::transaction(function () use ($user, $data) {
            $video = Video::create([
                'channel_id' => $user->id,
                'title' => $data->title,
                'description' => $data->description,
                'tags' => $data->tags,
                'status' => VideoStatus::PROCESSING,
                'scheduled_at' => $data->scheduledAt,
                'is_batch' => $data->isBatch,
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
     * @param User $user Authenticated channel owner
     * @param FinalizeUploadDTO $data Validated metadata + upload keys
     *
     * @throws ModelNotFoundException When the upload_key is not found in tus cache
     * @throws RuntimeException When the assembled file cannot be moved
     *
     * @return Video Freshly created Video (status=PROCESSING)
     */
    public function finalizeUpload(User $user, FinalizeUploadDTO $data): Video
    {
        $tusCache = new TusRedisStore;
        // TusServer sets prefix via reflection: 'tus:' + strtolower(ShortName) + ':'
        $tusCache->setPrefix('tus:server:');

        $fileMeta = $tusCache->get($data->uploadKey);
        $isFileReady = $fileMeta !== null && isset($fileMeta['file_path']) && file_exists($fileMeta['file_path']);

        if (!$isFileReady) {
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
                'is_batch' => $data->isBatch,
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
     * Delete a video and its associated files.
     *
     * @param Video $video Video to delete
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

    /**
     * Delete video files from storage.
     *
     * @param string|null $videoPath Path to video file
     * @param string|null $thumbnailPath Path to thumbnail file
     */
    private function deleteVideoFiles(?string $videoPath, ?string $thumbnailPath): void
    {
        foreach ([$videoPath, $thumbnailPath] as $path) {
            if ($path === null) {
                continue;
            }

            Storage::disk('public')->delete($path);
        }
    }
}
