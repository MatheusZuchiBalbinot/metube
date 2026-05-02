<?php

namespace App\Events;

use App\Models\User;
use App\Models\Video;

class VideoSaved
{
    public function __construct(
        public readonly User $user,
        public readonly Video $video,
    ) {}
}
