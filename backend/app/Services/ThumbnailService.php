<?php

declare(strict_types=1);

namespace App\Services;

use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ThumbnailService
{
    /**
     * Convert an image file to WebP, scaled down to fit within the given dimensions.
     *
     * @param string $absolutePath Full filesystem path to the source image
     * @param int $maxWidth Maximum output width in pixels
     * @param int $maxHeight Maximum output height in pixels
     * @param int $quality WebP quality (0–100)
     *
     * @return string Raw WebP binary content
     */
    public function convertToWebp(
        string $absolutePath,
        int $maxWidth = 0,
        int $maxHeight = 0,
        int $quality = 0,
    ): string {
        $maxWidth = $maxWidth !== 0 ? $maxWidth : (int) config('media.thumbnail.max_width');
        $maxHeight = $maxHeight !== 0 ? $maxHeight : (int) config('media.thumbnail.max_height');
        $quality = $quality !== 0 ? $quality : (int) config('media.thumbnail.quality');

        return (string) (new ImageManager(new Driver()))
            ->read($absolutePath)
            ->scaleDown(width: $maxWidth, height: $maxHeight)
            ->toWebp(quality: $quality);
    }
}
