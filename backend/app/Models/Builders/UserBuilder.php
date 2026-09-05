<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
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
