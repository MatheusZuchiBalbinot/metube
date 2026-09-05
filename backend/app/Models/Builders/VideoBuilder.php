<?php

declare(strict_types=1);

namespace App\Models\Builders;

use App\Config\PaginationSize;
use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Database\Eloquent\Builder;

/**
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
            $this->withAnyTag(array_values($filters['tags']));
        }

        if (isset($filters['status'])) {
            $this->where('status', $filters['status']);
        }

        return $this;
    }

    public function published(): self
    {
        return $this->where('status', VideoStatus::PUBLISHED);
    }

    /**
     * Named distinctly from Eloquent's native latest(), which orders by created_at.
     */
    public function newestPublished(): self
    {
        return $this->orderByDesc('published_at');
    }

    public function scheduledDue(): self
    {
        return $this->where('status', VideoStatus::SCHEDULED)
            ->where('scheduled_at', '<=', now());
    }

    public function byVuid(string $vuid): self
    {
        return $this->where('vuid', $vuid);
    }

    /**
     * Common "home feed shelf" query shape: published, newest first, channel
     * eager-loaded, capped at PaginationSize::FEED_SHELF.
     *
     * Consolidates the identical published()->newestPublished()->with('channel')
     * ->limit(...) chain FeedService repeated across its subscriptions, recent,
     * shorts and because-you-watched shelves. Callers should add any extra
     * `where`/`filter()` constraints before calling this, since it terminates
     * the chain with the limit.
     */
    public function feedShelf(): self
    {
        return $this->published()
            ->newestPublished()
            ->with('channel')
            ->limit(PaginationSize::FEED_SHELF);
    }

    /**
     * Published videos ordered by popularity (views desc) with channel
     * eager-loaded — the candidate-pool shape RecommendationService reuses
     * for its base pool, related-video fallback, and plain popular listing.
     * Callers add any extra `where`/`limit` before terminating the chain.
     */
    public function popularPool(): self
    {
        return $this->published()
            ->orderByDesc('views')
            ->with('channel');
    }

    /**
     * Exclude videos carrying the given tag.
     *
     * Used to keep shorts out of shelves (e.g. trending) that rank a broader
     * candidate pool before re-scoring, so the exclusion happens in SQL
     * instead of a PHP-side reject() over already-fetched rows.
     */
    public function excludingTag(string $tag): self
    {
        return $this->whereJsonDoesntContain('tags', $tag);
    }

    /**
     * Constrain the query to videos carrying any of the given tags (OR semantics).
     *
     * Public so other call sites that build ad-hoc tag predicates (e.g.
     * RecommendationService's candidate pools) reuse this driver-aware logic
     * instead of re-implementing the PostgreSQL `?|` / SQLite `orWhereJsonContains`
     * split by hand. No-op for an empty tag list.
     *
     * @param array<string> $tags
     */
    public function withAnyTag(array $tags): self
    {
        $this->applyTags($tags);

        return $this;
    }

    /**
     * Apply the driver-aware full-text search predicate.
     */
    private function applySearch(string $search): void
    {
        if ($this->isPostgres()) {
            // websearch_to_tsquery sanitizes user-facing search syntax itself
            // (quotes, boolean operators, punctuation) and never throws a
            // tsquery syntax error — unlike to_tsquery, which raised a 500 on
            // ordinary input like "C++" or an empty string.
            $this->whereRaw("search_tsv @@ websearch_to_tsquery('simple', ?)", [$search]);

            return;
        }

        $term = "%{$search}%";
        $this->where(function (Builder $query) use ($term): void {
            $query->where('title', 'like', $term)
                ->orWhere('description', 'like', $term);
        });
    }

    /**
     * Apply the driver-aware tag predicate (OR semantics). No-op for an empty
     * tag list, so callers can pass an unfiltered affinity set safely.
     *
     * @param array<string> $tags
     */
    private function applyTags(array $tags): void
    {
        if ($tags === []) {
            return;
        }

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

    private function isPostgres(): bool
    {
        return $this->getConnection()->getDriverName() === 'pgsql';
    }
}
