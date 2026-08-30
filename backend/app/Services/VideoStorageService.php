<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\StorageContract;
use App\Exceptions\VideoStorageException;

class VideoStorageService
{
    public function __construct(
        private readonly ThumbnailService $thumbnails,
        private readonly StorageContract $storage,
    ) {}

    /**
     * Both disks live under the same Docker volume so rename() is O(1)
     * instead of a full stream copy through PHP.
     *
     * @return string Disk-relative path: videos/{vuid}.{ext}
     */
    public function publishVideo(string $tmpPath, string $vuid): string
    {
        $ext = pathinfo($tmpPath, PATHINFO_EXTENSION);
        $finalPath = "videos/{$vuid}.{$ext}";

        $src = $this->storage->tempPath($tmpPath);
        $dst = $this->storage->publicPath($finalPath);

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
     * @return string Disk-relative path: thumbnails/{vuid}.webp
     */
    public function publishThumbnail(string $tmpPath, string $vuid): string
    {
        $thumbPath = "thumbnails/{$vuid}.webp";
        $absolutePath = $this->storage->tempPath($tmpPath);

        $webp = $this->thumbnails->convertToWebp($absolutePath);

        $this->storage->putPublic($thumbPath, $webp);
        $this->storage->deleteTempFile($tmpPath);

        return $thumbPath;
    }

    /**
     * @param string $lang BCP-47 language code (e.g. "pt", "en")
     *
     * @return string Disk-relative path: captions/{vuid}.{lang}.vtt
     */
    public function publishCaption(string $vttContent, string $vuid, string $lang): string
    {
        $captionPath = "captions/{$vuid}.{$lang}.vtt";
        $this->storage->putPublic($captionPath, $vttContent);

        return $captionPath;
    }

    public function exists(string $path): bool
    {
        return $this->storage->existsPublic($path);
    }

    /**
     * Used when a thumbnail is auto-generated (e.g. extracted from a video frame) and
     * the file already exists at a known absolute path rather than on a named disk.
     * The temporary file is removed after publication.
     *
     * @return string Disk-relative path: thumbnails/{vuid}.webp
     */
    public function publishThumbnailFromAbsPath(string $absPath, string $vuid): string
    {
        $thumbPath = "thumbnails/{$vuid}.webp";

        $webp = $this->thumbnails->convertToWebp($absPath);

        $this->storage->putPublic($thumbPath, $webp);

        if (is_file($absPath)) {
            unlink($absPath);
        }

        return $thumbPath;
    }

    public function absolutePublicPath(string $diskPath): string
    {
        return $this->storage->publicPath($diskPath);
    }

    public function deletePublished(string $diskPath): void
    {
        $this->storage->deleteFile($diskPath);
    }

    public function cleanupTmp(string $videoPath, ?string $thumbnailPath): void
    {
        $this->storage->deleteTempFile($videoPath);

        if ($thumbnailPath === null) {
            return;
        }

        $this->storage->deleteTempFile($thumbnailPath);
    }
}
