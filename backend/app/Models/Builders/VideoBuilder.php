<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query builder for the Video model.
 *
 * Replaces the former query scopes with typed, chainable methods so call sites
 * read as domain language (Video::query()->published()->newestPublished()) while
 * keeping full static analysis support under PHPStan level 8.
 *
 * @extends Builder<Video>
 */
class VideoBuilder extends Builder
{
    /**
     * Filter videos by free-text search, tags, and status.
     *
     * On PostgreSQL, search uses a pre-computed tsvector column (GIN-indexed).
     * On other drivers (SQLite in tests), falls back to LIKE. Tag filtering uses
     * OR semantics: any matching tag includes the video.
     *
     * @param array<string, mixed> $filters
     */
    public function filter(array $filters): self
    {
        if (isset($filters['search'])) {
            $this->applySearch((string) $filters['search']);
        }

        if (isset($filters['tags'])) {
            $this->applyTags(array_values($filters['tags']));
        }

        if (isset($filters['status'])) {
            $this->where('status', $filters['status']);
        }

        return $this;
    }

    /**
     * Restrict the query to published videos only.
     */
    public function published(): self
    {
        return $this->where('status', VideoStatus::PUBLISHED);
    }

    /**
     * Order by publication date, newest first.
     *
     * Named distinctly from Eloquent's native latest() which orders by created_at.
     */
    public function newestPublished(): self
    {
        return $this->orderByDesc('published_at');
    }

    /**
     * Restrict the query to scheduled videos whose scheduled_at has passed.
     */
    public function scheduledDue(): self
    {
        return $this->where('status', VideoStatus::SCHEDULED)
            ->where('scheduled_at', '<=', now());
    }

    /**
     * Filter a video by its public VUID.
     */
    public function byVuid(string $vuid): self
    {
        return $this->where('vuid', $vuid);
    }

    /**
     * Apply the driver-aware full-text search predicate.
     */
    private function applySearch(string $search): void
    {
        if ($this->isPostgres()) {
            $term = str_replace(' ', ' & ', trim($search));
            $this->whereRaw("search_tsv @@ to_tsquery('simple', ?)", [$term . ':*']);

            return;
        }

        $term = "%{$search}%";
        $this->where(function (Builder $query) use ($term): void {
            $query->where('title', 'like', $term)
                ->orWhere('description', 'like', $term);
        });
    }

    /**
     * Apply the driver-aware tag predicate (OR semantics).
     *
     * @param list<string> $tags
     */
    private function applyTags(array $tags): void
    {
        if ($this->isPostgres()) {
            $placeholders = implode(',', array_fill(0, count($tags), '?'));
            $this->whereRaw("tags ??| array[{$placeholders}]", $tags);

            return;
        }

        $this->where(function (Builder $query) use ($tags): void {
            foreach ($tags as $tag) {
                $query->orWhereJsonContains('tags', $tag);
            }
        });
    }

    /**
     * Whether the underlying connection is PostgreSQL.
     */
    private function isPostgres(): bool
    {
        return $this->getConnection()->getDriverName() === 'pgsql';
    }
}
