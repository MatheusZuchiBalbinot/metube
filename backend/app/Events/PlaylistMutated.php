<?php

namespace App\Events;

class PlaylistMutated
{
    public function __construct(
        public readonly int $userId,
    ) {}
}
