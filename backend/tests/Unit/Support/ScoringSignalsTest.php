<?php

declare(strict_types=1);

use App\Support\ScoringSignals;
use Illuminate\Support\Carbon;

describe('ScoringSignals::popularity', function () {
    test('returns 1.0 when views equals maxViews', function () {
        expect(ScoringSignals::popularity(100, 100))->toBe(1.0);
    });

    test('returns 0.0 for zero views', function () {
        expect(ScoringSignals::popularity(0, 100))->toBe(0.0);
    });

    test('is monotonically increasing with views', function () {
        $low = ScoringSignals::popularity(10, 1000);
        $high = ScoringSignals::popularity(500, 1000);

        expect($high)->toBeGreaterThan($low);
    });

    test('does not divide by zero when maxViews is zero', function () {
        expect(ScoringSignals::popularity(0, 0))->toBe(0.0);
    });
});

describe('ScoringSignals::freshness', function () {
    test('returns 0.0 for a null publish date', function () {
        expect(ScoringSignals::freshness(null))->toBe(0.0);
    });

    test('returns 1.0 (max freshness) for a video published today', function () {
        // freshness() resolves its own now() internally, so calling Carbon::now()
        // here and passing it in would race against that call by a few
        // microseconds, leaving ageInDays a hair above 0 and the score a hair
        // below 1.0. Freezing "now" makes both calls resolve identically.
        $frozen = Carbon::now();
        Carbon::setTestNow($frozen);

        expect(ScoringSignals::freshness($frozen))->toBe(1.0);

        Carbon::setTestNow();
    });

    test('scores an old video near zero, not astronomically high', function () {
        // Carbon 3's diffInDays() is signed: now()->diffInDays($past) returns a
        // negative number. Without abs() around it, exp(-diffInDays/halfLife)
        // flips sign and explodes for old videos instead of decaying toward
        // zero. This is the exact bug that silently sorted recommendations
        // oldest-first.
        $score = ScoringSignals::freshness(Carbon::now()->subDays(365));

        expect($score)->toBeLessThan(0.001)
            ->and($score)->toBeGreaterThanOrEqual(0.0);
    });

    test('decays monotonically as the video ages', function () {
        $recent = ScoringSignals::freshness(Carbon::now()->subDays(5));
        $old = ScoringSignals::freshness(Carbon::now()->subDays(60));

        expect($recent)->toBeGreaterThan($old);
    });

    test('a longer half-life decays more slowly for the same age', function () {
        $publishedAt = Carbon::now()->subDays(30);

        $shortHalfLife = ScoringSignals::freshness($publishedAt, 14.0);
        $longHalfLife = ScoringSignals::freshness($publishedAt, 60.0);

        expect($longHalfLife)->toBeGreaterThan($shortHalfLife);
    });
});
