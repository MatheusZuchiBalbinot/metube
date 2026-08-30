<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\MimeTypes;
use App\Contracts\StorageContract;
use App\Contracts\TusResolverContract;
use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Support\VideoFileManager;
use App\Support\VideoPayloadBuilder;
use finfo;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

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
     * @throws ModelNotFoundException When the upload_key is not found in tus cache
     * @throws \App\Exceptions\VideoStorageException When the assembled file cannot be moved
     * @throws ValidationException When the assembled file's real content type is not an allowed video/image MIME type
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
            $this->assertAllowedMime($tmpPath, MimeTypes::VIDEO_MIME_TYPES, 'video_file');

            try {
                $tmpThumbPath = $this->resolveThumbnail($data, $video->vuid);
            } catch (Throwable $e) {
                $this->storage->deleteTempFile($tmpPath);

                throw $e;
            }

            ProcessVideoUpload::dispatch($video, $tmpPath, $tmpThumbPath)->afterCommit();

            $this->tusResolver->delete($data->uploadKey);
            $this->tusResolver->clearOwnerCache($data->uploadKey);

            return $video->load('channel');
        });
    }

    /**
     * Determines whether the request carries a completed tus key (resumable upload)
     * or a raw multipart file (direct upload) and dispatches to the appropriate
     * method, so controllers do not need to branch on upload mode.
     *
     * @param array<string, mixed> $validated
     */
    public function handleUpload(User $user, array $validated): Video
    {
        $isTusUpload = isset($validated['upload_key']);

        if ($isTusUpload) {
            return $this->finalizeUpload($user, FinalizeUploadDTO::fromRequest($validated));
        }

        return $this->createVideo($user, CreateVideoDTO::fromRequest($validated));
    }

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
     * @throws \App\Exceptions\VideoStorageException When the thumbnail cannot be moved
     * @throws ValidationException When the assembled thumbnail's real content type is not an allowed image MIME type
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
        $this->assertAllowedMime($tmpThumbPath, MimeTypes::IMAGE_MIME_TYPES, 'thumbnail_key');

        $this->tusResolver->delete($thumbnailKey);
        $this->tusResolver->clearOwnerCache($thumbnailKey);

        return $tmpThumbPath;
    }

    /**
     * Verify that a tus-assembled file's real content matches an allowed MIME type.
     *
     * tus uploads never pass through Laravel's `mimes:` validation rule (only
     * the direct multipart path does), so the client-supplied filename
     * extension is the sole gate against arbitrary file types unless this
     * check inspects the actual bytes. Deletes the offending temp file and
     * fails validation when the content does not match.
     *
     * @param list<string> $allowedMimeTypes
     *
     * @throws ValidationException When the file's real content type is not in $allowedMimeTypes
     */
    private function assertAllowedMime(string $tempDiskPath, array $allowedMimeTypes, string $field): void
    {
        $absolutePath = $this->storage->tempPath($tempDiskPath);
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = is_file($absolutePath) ? $finfo->file($absolutePath) : false;
        $isAllowed = is_string($mimeType) && in_array($mimeType, $allowedMimeTypes, true);

        if ($isAllowed) {
            return;
        }

        $this->storage->deleteTempFile($tempDiskPath);

        throw ValidationException::withMessages([
            $field => ['The uploaded file content does not match an allowed format.'],
        ]);
    }

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
