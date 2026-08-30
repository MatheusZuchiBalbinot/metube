<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * ScoringSignals — Single source of truth for the popularity and freshness
 * math shared by recommendation and feed ranking.
 *
 * Before this class existed, the same two formulas were copy-pasted across
 * RecommendationService::score(), RecommendationService::relatedScore() and
 * FeedService's trending shelf, and one of the three copies silently dropped
 * the abs() needed for Carbon 3's signed diffInDays() — inverting the
 * freshness ranking in production. Consolidating the math here means a fix
 * (or an intentional tuning change) only has to happen once.
 */
final class ScoringSignals
{
    /**
     * Log-normalized popularity score in [0, 1].
     *
     * Uses log1p so raw view counts don't let a handful of viral videos drown
     * out every other signal in a linear sum.
     *
     * @return float Score in [0, 1]; 1.0 when $views === $maxViews
     */
    public static function popularity(int $views, int $maxViews): float
    {
        return log1p(max(0, $views)) / log1p(max(1, $maxViews));
    }

    /**
     * Exponential freshness decay in [0, 1]; newer videos score closer to 1.0.
     *
     * Carbon 3's diffInDays() is signed (negative for a timestamp in the
     * past), so the day difference is wrapped in abs() before it feeds the
     * exponent. Without it, an old video yields a large positive exponent
     * and an enormous score instead of a tiny one — the exact bug this
     * class exists to make impossible to reintroduce.
     *
     * @return float Score in [0, 1]; 0.0 when $publishedAt is null
     */
    public static function freshness(?Carbon $publishedAt, float $halfLifeDays = 30.0): float
    {
        if ($publishedAt === null) {
            return 0.0;
        }

        $ageInDays = abs(now()->diffInDays($publishedAt));

        return exp(-$ageInDays / $halfLifeDays);
    }

    private function __construct() {}
}
