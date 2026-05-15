<?php

namespace App\Events;

use App\Models\Video;
use Illuminate\Foundation\Events\Dispatchable;

class VideoPublished
{
    use Dispatchable;

    public function __construct(
        public readonly Video $video,
    ) {}
}
