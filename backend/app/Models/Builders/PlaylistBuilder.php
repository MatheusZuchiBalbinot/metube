<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Models\Playlist;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the Playlist model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language while keeping full static analysis support under
 * PHPStan level 8.
 *
 * @extends Builder<Playlist>
 */
class PlaylistBuilder extends Builder
{
    public function byPuid(string $puid): self
    {
        return $this->where('puid', $puid);
    }

    public function ofUser(int $userId): self
    {
        return $this->where('user_id', $userId);
    }

    public function newest(): self
    {
        return $this->orderByDesc('created_at');
    }

    public function recent(int $days = 30): self
    {
        return $this->where('created_at', '>=', now()->subDays($days));
    }
}
