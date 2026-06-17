<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\CommentVersion;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the CommentVersion model.
 *
 * Replaces the former query scope with a typed, chainable method so call sites
 * read as domain language (CommentVersion::query()->newest()) while keeping full
 * static analysis support under PHPStan level 8.
 *
 * @extends Builder<CommentVersion>
 */
class CommentVersionBuilder extends Builder
{
    /**
     * Order versions by version number, newest first.
     */
    public function newest(): self
    {
        return $this->orderByDesc('version');
    }
}
