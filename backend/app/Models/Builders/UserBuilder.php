<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the User model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language while keeping full static analysis support under
 * PHPStan level 8.
 *
 * @extends Builder<User>
 */
class UserBuilder extends Builder
{
    public function byUuid(string $uuid): self
    {
        return $this->where('uuid', $uuid);
    }

    public function recent(int $days = 30): self
    {
        return $this->where('created_at', '>=', now()->subDays($days));
    }

    public function active(int $days = 7): self
    {
        return $this->where('updated_at', '>=', now()->subDays($days));
    }
}
