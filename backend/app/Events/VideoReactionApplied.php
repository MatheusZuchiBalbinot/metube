<?php

namespace App\Events;

use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\Video;

class VideoReactionApplied
{
    public function __construct(
        public readonly User $user,
        public readonly Video $video,
        public readonly VideoEventType $type,
    ) {}
}
