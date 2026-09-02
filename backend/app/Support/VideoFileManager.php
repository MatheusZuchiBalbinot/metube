<?php

declare(strict_types=1);

namespace App\Support;

use App\Config\MimeTypes;
use App\Contracts\StorageContract;

/**
 * Moves assembled tus uploads from their temporary location into the standard
 * uploads/tmp area, resolving each file's extension with a safe fallback.
 *
 * All physical access is delegated to {@see StorageContract}, so the manager
 * is agnostic of the underlying disk.
 */
final class VideoFileManager
{
    public function __construct(
        private readonly StorageContract $storage,
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

        $filename = (string) ($fileMeta['name'] ?? 'video.mp4');
        $sourcePath = (string) $fileMeta['file_path'];
        $extension = $this->resolveExtension($filename, 'mp4', MimeTypes::VIDEO_EXTENSIONS);
        $destination = "uploads/tmp/{$vuid}.{$extension}";

        $this->storage->moveFile($sourcePath, $destination);

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
        $filename = (string) ($thumbMeta['name'] ?? 'thumb.jpg');
        $sourcePath = (string) $thumbMeta['file_path'];
        $extension = $this->resolveExtension($filename, 'jpg', MimeTypes::IMAGE_EXTENSIONS);
        $destination = "uploads/tmp/thumb_{$vuid}.{$extension}";

        $this->storage->moveFile($sourcePath, $destination);

        return $destination;
    }

    /**
     * Extract a lowercase file extension, falling back to a safe default when
     * the filename has none or its extension is not on the allowlist.
     *
     * The filename is client-supplied and untrusted — an attacker-chosen
     * extension (e.g. `.html`) would otherwise let arbitrary content be
     * published under a dangerous content type. Public so both upload paths
     * (tus and direct multipart) share this same allowlist logic.
     *
     * @param string $filename Original filename (client-controlled, untrusted)
     * @param string $fallback Extension to use when the filename's extension is missing or not allowed
     * @param list<string> $allowed Lowercase extensions permitted for this file kind
     *
     * @return string The resolved extension (without the dot), guaranteed to be in $allowed or equal to $fallback
     */
    public function resolveExtension(string $filename, string $fallback, array $allowed): string
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return in_array($ext, $allowed, true) ? $ext : $fallback;
    }
}
