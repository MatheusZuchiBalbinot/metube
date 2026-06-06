<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\FeedSectionKey;
use App\Models\Video;
use Illuminate\Support\Collection;

/**
 * A single shelf of the home feed (a titled, ordered list of videos).
 */
final readonly class FeedSection
{
    /**
     * @param FeedSectionKey $key Stable identifier the frontend maps to a label
     * @param string|null $label Dynamic label (e.g. the tag for "because you watched")
     * @param Collection<int, Video> $videos Videos to display in this shelf
     */
    public function __construct(
        public FeedSectionKey $key,
        public ?string $label,
        public Collection $videos,
    ) {}
}
