<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class VideoStorageService
{
    public function __construct(private readonly ThumbnailService $thumbnails) {}

    /**
     * Move a video from temporary local storage to public storage.
     *
     * @param  string  $tmpPath  Path relative to the 'local' disk (e.g. uploads/tmp/{vuid}.mp4)
     * @param  string  $vuid     Video ULID used as the public filename
     * @return string  Root-relative URL: /storage/videos/{vuid}.{ext}
     */
    public function publishVideo(string $tmpPath, string $vuid): string
    {
        $ext = pathinfo($tmpPath, PATHINFO_EXTENSION);
        $finalPath = "videos/{$vuid}.{$ext}";

        Storage::disk('public')->put($finalPath, Storage::disk('local')->readStream($tmpPath));
        Storage::disk('local')->delete($tmpPath);

        return '/storage/' . $finalPath;
    }

    /**
     * Convert a thumbnail to WebP and move it from temporary local storage to public storage.
     *
     * @param  string  $tmpPath  Path relative to the 'local' disk
     * @param  string  $vuid     Video ULID used as the public filename
     * @return string  Root-relative URL: /storage/thumbnails/{vuid}.webp
     */
    public function publishThumbnail(string $tmpPath, string $vuid): string
    {
        $thumbPath = "thumbnails/{$vuid}.webp";
        $absolutePath = Storage::disk('local')->path($tmpPath);

        $webp = $this->thumbnails->convertToWebp($absolutePath);

        Storage::disk('public')->put($thumbPath, $webp);
        Storage::disk('local')->delete($tmpPath);

        return '/storage/' . $thumbPath;
    }

    /**
     * Delete temporary files from local storage.
     *
     * @param  string       $videoPath      Path relative to the 'local' disk
     * @param  string|null  $thumbnailPath  Path relative to the 'local' disk, or null if none
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
