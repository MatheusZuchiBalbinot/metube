<?php

namespace App\Events;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class CommentLiked
{
    use Dispatchable;

    public function __construct(
        public readonly Comment $comment,
        public readonly User $liker,
    ) {}
}
