<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\MimeTypes;
use App\Contracts\StorageContract;
use App\Contracts\TusResolverContract;
use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Enums\VideoStatus;
use App\Events\VideoStatusUpdated;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Services\Tus\TusQuotaService;
use App\Support\VideoFileManager;
use App\Support\VideoPayloadBuilder;
use finfo;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
        private readonly TusQuotaService $tusQuota,
    ) {}

    /**
     * @return Video Created video with status=PROCESSING
     */
    public function createVideo(User $user, CreateVideoDTO $data): Video
    {
        return DB::transaction(function () use ($user, $data) {
            $video = Video::create(VideoPayloadBuilder::fromCreateDTO($user, $data));

            $ext = $this->fileManager->resolveExtension(
                $data->videoFile->getClientOriginalName(),
                'mp4',
                MimeTypes::VIDEO_EXTENSIONS,
            );
            $tmpPath = $data->videoFile->storeAs('uploads/tmp', "{$video->vuid}.{$ext}");

            $tmpThumbPath = null;

            if ($data->thumbnailFile !== null) {
                $thumbExt = $this->fileManager->resolveExtension(
                    $data->thumbnailFile->getClientOriginalName(),
                    'jpg',
                    MimeTypes::IMAGE_EXTENSIONS,
                );
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

        // Session claimed — free its quota reservation regardless of outcome below.
        $this->tusQuota->release($user->id, (int) ($fileMeta['size'] ?? 0));

        return DB::transaction(function () use ($user, $data, $fileMeta) {
            $video = Video::create(VideoPayloadBuilder::fromFinalizeDTO($user, $data));

            $tmpPath = $this->fileManager->moveVideoFromTus($fileMeta, $video->vuid);
            $this->assertAllowedMime($tmpPath, MimeTypes::VIDEO_MIME_TYPES, 'video_file');

            try {
                $tmpThumbPath = $this->resolveThumbnail($data, $video->vuid, $user->id);
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

    /**
     * Marks videos stuck in PROCESSING past a generous grace period as FAILED.
     *
     * A video can get stuck forever if ProcessVideoUpload's dispatch never
     * lands (e.g. Redis unavailable right after the Video row commits) — no
     * job is left to retry it. The default threshold clears the job's own
     * worst case (timeout=3600s × up to 3 tries plus backoff).
     *
     * @return int Number of videos reconciled
     */
    public function reconcileStuckProcessing(int $olderThanMinutes = 240): int
    {
        $threshold = now()->subMinutes($olderThanMinutes);

        $stuck = Video::query()
            ->where('status', VideoStatus::PROCESSING)
            ->where('created_at', '<', $threshold)
            ->get();

        foreach ($stuck as $video) {
            Log::warning('VideoUploadService: reconciling video stuck in PROCESSING', [
                'vuid' => $video->vuid,
                'created_at' => $video->created_at->toIso8601String(),
            ]);

            $video->update(['status' => VideoStatus::FAILED]);
            event(new VideoStatusUpdated($video, VideoStatus::FAILED));
        }

        return $stuck->count();
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
    private function resolveThumbnail(FinalizeUploadDTO $data, string $vuid, int $userId): ?string
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

        $this->tusQuota->release($userId, (int) ($thumbMeta['size'] ?? 0));

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
