<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\VideoStorageException;
use Illuminate\Support\Facades\Storage;

class VideoStorageService
{
    public function __construct(private readonly ThumbnailService $thumbnails) {}

    /**
     * Move a video from temporary local storage to public storage.
     *
     * Both disks live under the same Docker volume so rename() is O(1)
     * instead of a full stream copy through PHP.
     *
     * @param string $tmpPath Path relative to the 'local' disk (e.g. uploads/tmp/{vuid}.mp4)
     * @param string $vuid Video ULID used as the public filename
     *
     * @return string Disk-relative path: videos/{vuid}.{ext}
     */
    public function publishVideo(string $tmpPath, string $vuid): string
    {
        $ext = pathinfo($tmpPath, PATHINFO_EXTENSION);
        $finalPath = "videos/{$vuid}.{$ext}";

        $src = Storage::disk('local')->path($tmpPath);
        $dst = Storage::disk('public')->path($finalPath);

        $dstDir = dirname($dst);
        $isDirMissing = !is_dir($dstDir);

        if ($isDirMissing) {
            mkdir($dstDir, 0755, true);
        }

        $moved = rename($src, $dst);

        if (!$moved) {
            throw VideoStorageException::moveFailed($src, $dst);
        }

        return $finalPath;
    }

    /**
     * Convert a thumbnail to WebP and move it from temporary local storage to public storage.
     *
     * @param string $tmpPath Path relative to the 'local' disk
     * @param string $vuid Video ULID used as the public filename
     *
     * @return string Disk-relative path: thumbnails/{vuid}.webp
     */
    public function publishThumbnail(string $tmpPath, string $vuid): string
    {
        $thumbPath = "thumbnails/{$vuid}.webp";
        $absolutePath = Storage::disk('local')->path($tmpPath);

        $webp = $this->thumbnails->convertToWebp($absolutePath);

        Storage::disk('public')->put($thumbPath, $webp);
        Storage::disk('local')->delete($tmpPath);

        return $thumbPath;
    }

    /**
     * Write a WebVTT caption file to public storage.
     *
     * @param string $vttContent WebVTT file content
     * @param string $vuid Video public identifier used as the filename stem
     * @param string $lang BCP-47 language code (e.g. "pt", "en")
     *
     * @return string Disk-relative path: captions/{vuid}.{lang}.vtt
     */
    public function publishCaption(string $vttContent, string $vuid, string $lang): string
    {
        $captionPath = "captions/{$vuid}.{$lang}.vtt";
        Storage::disk('public')->put($captionPath, $vttContent);

        return $captionPath;
    }

    /**
     * Determine whether a published file exists on the public disk.
     *
     * @param string $path Path relative to the public disk
     *
     * @return bool True when the file exists
     */
    public function exists(string $path): bool
    {
        return Storage::disk('public')->exists($path);
    }

    /**
     * Convert a thumbnail from an absolute filesystem path to WebP and publish it.
     *
     * Used when a thumbnail is auto-generated (e.g. extracted from a video frame) and
     * the file already exists at a known absolute path rather than on a named disk.
     * The temporary file is removed after publication.
     *
     * @param string $absPath Absolute filesystem path to the source image
     * @param string $vuid Video ULID used as the public filename
     *
     * @return string Disk-relative path: thumbnails/{vuid}.webp
     */
    public function publishThumbnailFromAbsPath(string $absPath, string $vuid): string
    {
        $thumbPath = "thumbnails/{$vuid}.webp";

        $webp = $this->thumbnails->convertToWebp($absPath);

        Storage::disk('public')->put($thumbPath, $webp);

        if (is_file($absPath)) {
            unlink($absPath);
        }

        return $thumbPath;
    }

    /**
     * Resolve the absolute filesystem path for a public-disk-relative path.
     *
     * @param string $diskPath Path relative to the public disk
     *
     * @return string Absolute filesystem path
     */
    public function absolutePublicPath(string $diskPath): string
    {
        return Storage::disk('public')->path($diskPath);
    }

    /**
     * Delete a published file from the public disk.
     *
     * @param string $diskPath Path relative to the public disk
     */
    public function deletePublished(string $diskPath): void
    {
        Storage::disk('public')->delete($diskPath);
    }

    /**
     * Delete temporary files from local storage.
     *
     * @param string $videoPath Path relative to the 'local' disk
     * @param string|null $thumbnailPath Path relative to the 'local' disk, or null if none
     */
    public function cleanupTmp(string $videoPath, ?string $thumbnailPath): void
    {
        Storage::disk('local')->delete($videoPath);

        if ($thumbnailPath === null) {
            return;
        }

        Storage::disk('local')->delete($thumbnailPath);
    }
}
