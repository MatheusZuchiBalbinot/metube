<?php

declare(strict_types=1);

namespace Database\Seeders\Support;

/**
 * Turns a DemoVideoContext + DemoCategoryBank into the actual text a video
 * needs (description, key points, chapters, transcript, comments, reading
 * mode). Every pick below is seeded from the context, not from PHP's global
 * random state — re-seeding the database always regenerates byte-identical
 * content, and two videos in the same category draw different slices of the
 * bank instead of the exact same paragraph with only the title swapped.
 */
final class DemoContentGenerator
{
    /**
     * The opening sentence always names the video by title (drawn from
     * whichever bank sentences carry the `{title}` placeholder), so a
     * randomly-picked description can never end up generic enough that it
     * reads as if it belongs to any other video in the category. Any
     * additional sentences fill in from the rest of the bank.
     */
    public function description(DemoVideoContext $context, DemoCategoryBank $bank, int $sentenceCount = 2): string
    {
        [$titled, $untitled] = $this->splitByTitlePlaceholder($bank->descriptions);

        $openerIndex = $this->pickIndices($context->seed(), count($titled), 1)[0] ?? 0;
        $opener = str_replace('{title}', $context->title, $titled[$openerIndex]);

        $fillerCount = max($sentenceCount - 1, 0);
        $fillerIndices = $this->pickIndices($context->seed() + 10, count($untitled), $fillerCount);
        sort($fillerIndices);
        $fillers = array_map(fn (int $i): string => $untitled[$i], $fillerIndices);

        return trim(implode(' ', [$opener, ...$fillers]));
    }

    /**
     * @return list<string>
     */
    public function keyPoints(DemoVideoContext $context, DemoCategoryBank $bank, int $count = 4): array
    {
        $take = min($count, count($bank->keyPoints));
        $indices = $this->pickIndices($context->seed() + 1, count($bank->keyPoints), $take);
        sort($indices);

        return array_map(fn (int $i): string => $bank->keyPoints[$i], $indices);
    }

    /**
     * Chapters always open with the bank's first entry (the intro) so the
     * narrative arc stays coherent, then fill in a seeded subset of the rest —
     * different videos in the same category end up with a different number and
     * mix of middle/closing chapters instead of the identical fixed list.
     *
     * @return list<array{timestamp: string, title: string}>
     */
    public function chapters(DemoVideoContext $context, DemoCategoryBank $bank, float $duration): array
    {
        $rest = array_slice($bank->chapters, 1);
        $take = max(2, min(4, count($rest)));
        $indices = $this->pickIndices($context->seed() + 2, count($rest), $take);
        sort($indices);

        $titles = [$bank->chapters[0], ...array_map(fn (int $i): string => $rest[$i], $indices)];

        return $this->timestampChapters($titles, $duration);
    }

    /**
     * The full narration behind a video: an opening line, every key point read
     * out loud, and a category-appropriate sign-off — used for both the plain
     * transcript and its WebVTT rendering.
     *
     * @return list<string>
     */
    public function transcriptSentences(DemoVideoContext $context, DemoCategoryBank $bank): array
    {
        $opening = $this->description($context, $bank, 1);

        $closingIndex = ($context->seed() + 3) % count($bank->closingLines);
        $closing = $bank->closingLines[$closingIndex];

        return [$opening, ...$bank->keyPoints, $closing];
    }

    /**
     * A short prose summary for the video-page "reading mode": a two-sentence
     * intro followed by three key points, both seeded independently from the
     * plain description() call so the two don't always overlap.
     */
    public function readingMode(DemoVideoContext $context, DemoCategoryBank $bank): string
    {
        $intro = $this->description($context, $bank, 2);
        $points = $this->keyPoints($context, $bank, 3);

        return trim($intro . ' ' . implode(' ', $points));
    }

    /**
     * @return list<string>
     */
    public function comments(DemoVideoContext $context, DemoCategoryBank $bank, int $count): array
    {
        $take = min($count, count($bank->comments));
        $indices = $this->pickIndices($context->seed() + 4, count($bank->comments), $take);

        return array_map(fn (int $i): string => $bank->comments[$i], $indices);
    }

    /**
     * @param list<string> $titles
     *
     * @return list<array{timestamp: string, title: string}>
     */
    private function timestampChapters(array $titles, float $duration): array
    {
        $count = count($titles);

        return array_map(
            fn (int $i, string $title): array => [
                'timestamp' => $this->formatTimestamp((int) floor($duration * $i / $count)),
                'title' => $title,
            ],
            array_keys($titles),
            $titles,
        );
    }

    private function formatTimestamp(int $seconds): string
    {
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $secs = $seconds % 60;

        return $hours > 0
            ? sprintf('%d:%02d:%02d', $hours, $minutes, $secs)
            : sprintf('%d:%02d', $minutes, $secs);
    }

    /**
     * @param list<string> $sentences
     *
     * @return array{0: list<string>, 1: list<string>} [titled, untitled]
     */
    private function splitByTitlePlaceholder(array $sentences): array
    {
        $titled = [];
        $untitled = [];

        foreach ($sentences as $sentence) {
            if (str_contains($sentence, '{title}')) {
                $titled[] = $sentence;
            } else {
                $untitled[] = $sentence;
            }
        }

        // Every bank is expected to carry at least one {title} sentence, but
        // fall back to the full pool rather than crashing if one ever doesn't.
        return $titled !== [] ? [$titled, $untitled] : [$sentences, $untitled];
    }

    /**
     * Deterministically samples $take distinct indices from [0, $poolSize) —
     * a seeded, dependency-free stand-in for `array_rand()`/`Collection::random()`,
     * neither of which accept a seed. Built on xorshift32 so it never touches
     * PHP's global `mt_rand` state (Faker and other seeder code rely on that
     * being left alone).
     *
     * @return list<int>
     */
    private function pickIndices(int $seed, int $poolSize, int $take): array
    {
        if ($poolSize <= 0) {
            return [];
        }

        $take = min($take, $poolSize);
        $pool = range(0, $poolSize - 1);
        $state = $seed === 0 ? 1 : abs($seed);
        $picked = [];

        for ($i = 0; $i < $take; $i++) {
            $state = $this->xorshift32($state);
            $poolIndex = $state % count($pool);
            $picked[] = $pool[$poolIndex];
            array_splice($pool, $poolIndex, 1);
        }

        return $picked;
    }

    private function xorshift32(int $state): int
    {
        $state ^= ($state << 13) & 0xFFFFFFFF;
        $state ^= ($state >> 17);
        $state ^= ($state << 5) & 0xFFFFFFFF;

        return $state & 0xFFFFFFFF;
    }
}
