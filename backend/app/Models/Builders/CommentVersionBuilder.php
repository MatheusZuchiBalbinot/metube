<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\CommentVersion;
use Illuminate\Database\Eloquent\Builder;

/**
 * @extends Builder<CommentVersion>
 */
class CommentVersionBuilder extends Builder
{
    public function newest(): self
    {
        return $this->orderByDesc('version');
    }
}
