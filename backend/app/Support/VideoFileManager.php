<?php

declare(strict_types=1);

namespace App\Support;

use App\Contracts\VideoStorageContract;

/**
 * Moves assembled tus uploads from their temporary location into the standard
 * uploads/tmp area, resolving each file's extension with a safe fallback.
 *
 * All physical access is delegated to {@see VideoStorageContract}, so the manager
 * is agnostic of the underlying disk.
 */
final class VideoFileManager
{
    public function __construct(
        private readonly VideoStorageContract $storage,
    ) {}

    /**
     * Move the assembled video file into uploads/tmp/{vuid}.{ext}.
     *
     * @param array<string, mixed> $fileMeta tus metadata for the video upload
     * @param string $vuid Video public identifier used as the filename stem
     *
     * @throws \App\Exceptions\VideoStorageException When the move fails
     *
     * @return string Disk-relative destination path
     */
    public function moveVideoFromTus(array $fileMeta, string $vuid): string
    {
        $this->storage->ensureDirectoryExists('uploads/tmp');

        $ext = $this->resolveExtension((string) ($fileMeta['name'] ?? 'video.mp4'), 'mp4');
        $destination = "uploads/tmp/{$vuid}.{$ext}";

        $this->storage->moveFile((string) $fileMeta['file_path'], $destination);

        return $destination;
    }

    /**
     * Move the assembled thumbnail file into uploads/tmp/thumb_{vuid}.{ext}.
     *
     * @param array<string, mixed> $thumbMeta tus metadata for the thumbnail upload
     * @param string $vuid Video public identifier used as the filename stem
     *
     * @throws \App\Exceptions\VideoStorageException When the move fails
     *
     * @return string Disk-relative destination path
     */
    public function moveThumbnailFromTus(array $thumbMeta, string $vuid): string
    {
        $ext = $this->resolveExtension((string) ($thumbMeta['name'] ?? 'thumb.jpg'), 'jpg');
        $destination = "uploads/tmp/thumb_{$vuid}.{$ext}";

        $this->storage->moveFile((string) $thumbMeta['file_path'], $destination);

        return $destination;
    }

    /**
     * Extract a lowercase file extension, falling back when none is present.
     *
     * @param string $filename Original filename
     * @param string $fallback Extension to use when the filename has none
     *
     * @return string The resolved extension (without the dot)
     */
    private function resolveExtension(string $filename, string $fallback): string
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return $ext !== '' ? $ext : $fallback;
    }
}
