<?php

declare(strict_types=1);

namespace Database\Seeders\Support;

use InvalidArgumentException;

/**
 * On-topic content for one demo category. Validated at construction so a
 * category defined with too few entries fails loudly at seed time instead of
 * silently producing repetitive content (the original bug this replaces:
 * every video in a category showed the exact same description/key
 * points/chapters, because the bank only ever held as many entries as a
 * single video needed).
 *
 * `descriptions` sentences may contain a `{title}` placeholder, interpolated
 * by DemoContentGenerator; sentences without it work as general filler that
 * fits after any opener.
 */
final readonly class DemoCategoryBank
{
    private const MIN_DESCRIPTIONS = 4;

    private const MIN_KEY_POINTS = 4;

    private const MIN_CHAPTERS = 4;

    private const MIN_COMMENTS = 8;

    private const MIN_CLOSING_LINES = 3;

    /**
     * @param array{string, string} $color Hex pair (background, accent), no leading '#'.
     * @param list<string> $descriptions
     * @param list<string> $keyPoints
     * @param list<string> $chapters Ordered narrative arc — chapters[0] is always the intro.
     * @param list<string> $comments
     * @param list<string> $closingLines
     */
    public function __construct(
        public array $color,
        public string $icon,
        public array $descriptions,
        public array $keyPoints,
        public array $chapters,
        public array $comments,
        public array $closingLines,
    ) {
        $this->assertMinCount($descriptions, self::MIN_DESCRIPTIONS, 'descriptions');
        $this->assertMinCount($keyPoints, self::MIN_KEY_POINTS, 'keyPoints');
        $this->assertMinCount($chapters, self::MIN_CHAPTERS, 'chapters');
        $this->assertMinCount($comments, self::MIN_COMMENTS, 'comments');
        $this->assertMinCount($closingLines, self::MIN_CLOSING_LINES, 'closingLines');
    }

    /**
     * @param list<string> $values
     */
    private function assertMinCount(array $values, int $min, string $field): void
    {
        $count = count($values);

        if ($count < $min) {
            throw new InvalidArgumentException(
                "Demo category bank field '{$field}' needs at least {$min} entries to give videos in "
                . "the same category genuinely different content, got {$count}.",
            );
        }
    }
}
