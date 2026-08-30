<?php

declare(strict_types=1);

namespace App\Notifications\Concerns;

use App\Contracts\StorageContract;
use App\Models\Video;

trait IncludesVideoThumbnail
{
    /**
     * Notifications embed this so the frontend can render the thumbnail
     * without depending on the video already being present in its store.
     */
    protected function thumbnailUrl(Video $video): ?string
    {
        if ($video->thumbnail_url === null) {
            return null;
        }

        return app(StorageContract::class)->publicUrl($video->thumbnail_url);
    }
}
