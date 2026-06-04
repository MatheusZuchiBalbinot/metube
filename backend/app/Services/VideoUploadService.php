<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\StorageContract;
use App\Contracts\TusResolverContract;
use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Support\VideoFileManager;
use App\Support\VideoPayloadBuilder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * VideoUploadService — Orchestrates the video upload and deletion workflows.
 *
 * Responsible for:
 * - Creating new videos from single-POST uploads
 * - Finalizing tus resumable uploads
 * - Deleting videos and their associated files
 *
 * Infrastructure concerns are delegated to collaborators: file moves go through
 * {@see VideoFileManager}, tus cache access through {@see TusResolverContract},
 * file deletion through {@see StorageContract}, and payload construction
 * through {@see VideoPayloadBuilder}.
 */
final class VideoUploadService
{
    public function __construct(
        private readonly VideoFileManager $fileManager,
        private readonly TusResolverContract $tusResolver,
        private readonly StorageContract $storage,
    ) {}

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
            $video = Video::create(VideoPayloadBuilder::fromCreateDTO($user, $data));

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
     * @throws \App\Exceptions\VideoStorageException When the assembled file cannot be moved
     *
     * @return Video Freshly created Video (status=PROCESSING)
     */
    public function finalizeUpload(User $user, FinalizeUploadDTO $data): Video
    {
        $fileMeta = $this->tusResolver->get($data->uploadKey);
        $isFileReady = $fileMeta !== null
            && isset($fileMeta['file_path'])
            && file_exists((string) $fileMeta['file_path']);

        if (!$isFileReady) {
            throw new ModelNotFoundException('Upload session not found or file is incomplete.');
        }

        return DB::transaction(function () use ($user, $data, $fileMeta) {
            $video = Video::create(VideoPayloadBuilder::fromFinalizeDTO($user, $data));

            $tmpPath = $this->fileManager->moveVideoFromTus($fileMeta, $video->vuid);
            $tmpThumbPath = $this->resolveThumbnail($data, $video->vuid);

            ProcessVideoUpload::dispatch($video, $tmpPath, $tmpThumbPath)->afterCommit();

            $this->tusResolver->delete($data->uploadKey);
            $this->tusResolver->clearOwnerCache($data->uploadKey);

            return $video->load('channel');
        });
    }

    /**
     * Route an upload request to the correct upload path.
     *
     * Determines whether the request carries a completed tus key (resumable upload)
     * or a raw multipart file (direct upload) and dispatches to the appropriate
     * method, so controllers do not need to branch on upload mode.
     *
     * @param User $user Authenticated channel owner
     * @param array<string, mixed> $validated Validated request payload
     *
     * @return Video Created video with status=PROCESSING
     */
    public function handleUpload(User $user, array $validated): Video
    {
        $isTusUpload = isset($validated['upload_key']);

        if ($isTusUpload) {
            return $this->finalizeUpload($user, FinalizeUploadDTO::fromRequest($validated));
        }

        return $this->createVideo($user, CreateVideoDTO::fromRequest($validated));
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
        $hlsDirectory = $video->hlsDirectory();

        DB::transaction(function () use ($video) {
            $video->delete();
        });

        $this->deleteVideoFiles($videoPath, $thumbnailPath);
        $this->storage->deleteDirectory($hlsDirectory);
    }

    /**
     * Move the finalized thumbnail out of tus storage, if one was uploaded.
     *
     * @param FinalizeUploadDTO $data Validated metadata + upload keys
     * @param string $vuid Video public identifier used as the filename stem
     *
     * @throws \App\Exceptions\VideoStorageException When the thumbnail cannot be moved
     *
     * @return string|null Disk-relative thumbnail path, or null when absent or incomplete
     */
    private function resolveThumbnail(FinalizeUploadDTO $data, string $vuid): ?string
    {
        $thumbnailKey = $data->thumbnailKey;

        if ($thumbnailKey === null) {
            return null;
        }

        $thumbMeta = $this->tusResolver->get($thumbnailKey);
        $isThumbReady = $thumbMeta !== null
            && isset($thumbMeta['file_path'])
            && file_exists((string) $thumbMeta['file_path']);

        if (!$isThumbReady) {
            return null;
        }

        $tmpThumbPath = $this->fileManager->moveThumbnailFromTus($thumbMeta, $vuid);

        $this->tusResolver->delete($thumbnailKey);
        $this->tusResolver->clearOwnerCache($thumbnailKey);

        return $tmpThumbPath;
    }

    /**
     * Delete published video files from storage.
     *
     * @param string|null $videoPath Path to the video file on the public disk
     * @param string|null $thumbnailPath Path to the thumbnail file on the public disk
     */
    private function deleteVideoFiles(?string $videoPath, ?string $thumbnailPath): void
    {
        foreach ([$videoPath, $thumbnailPath] as $path) {
            if ($path === null) {
                continue;
            }

            $this->storage->deleteFile($path);
        }
    }
}
