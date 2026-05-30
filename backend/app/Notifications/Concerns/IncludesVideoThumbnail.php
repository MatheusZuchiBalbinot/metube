<?php

namespace App\Notifications\Concerns;

use App\Models\Video;
use Illuminate\Support\Facades\Storage;

trait IncludesVideoThumbnail
{
    /**
     * Resolve the public URL for a video's thumbnail, or null when absent.
     *
     * Notifications embed this so the frontend can render the thumbnail
     * without depending on the video already being present in its store.
     *
     * @param  Video  $video  The video whose thumbnail should be resolved
     */
    protected function thumbnailUrl(Video $video): ?string
    {
        if ($video->thumbnail_url === null) {
            return null;
        }

        return Storage::disk('public')->url($video->thumbnail_url);
    }
}
