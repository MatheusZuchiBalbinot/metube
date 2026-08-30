<?php

declare(strict_types=1);

namespace App\Services;

use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ThumbnailService
{
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
