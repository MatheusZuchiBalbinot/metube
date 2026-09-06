<?php

declare(strict_types=1);

namespace Database\Seeders\Support;

/**
 * Everything DemoContentGenerator needs to know about a single video to
 * generate content for it: which category bank to draw from, the real title
 * to interpolate, and a deterministic seed so re-running the seeder always
 * regenerates the exact same variation instead of a fresh random one.
 */
final readonly class DemoVideoContext
{
    /**
     * @param list<string> $channelTags Fallback tags when DemoTagGenerator finds
     *                                  no keyword match in the title.
     */
    public function __construct(
        public string $category,
        public string $title,
        public int $index,
        public array $channelTags,
    ) {}

    /**
     * A stable per-video seed derived from category + title (not the mutable
     * $index, which shifts whenever a channel's title list is reordered) — so
     * the same video always draws the same slice of its category bank across
     * re-seeds, without needing to persist any generator state.
     */
    public function seed(): int
    {
        return crc32("{$this->category}:{$this->title}");
    }
}
