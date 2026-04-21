<?php

namespace App\Enums;

use Illuminate\Support\Carbon;

/**
 * HistoryPeriod — Watch history time period enum.
 *
 * Values:
 * - TODAY: Last 24 hours
 * - WEEK: Last 7 days
 * - MONTH: Last 30 days
 * - ALL: Entire history
 */
enum HistoryPeriod: string
{
    case TODAY = 'today';
    case WEEK = 'week';
    case MONTH = 'month';
    case ALL = 'all';

    /**
     * Get all available values as array.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /**
     * Get the start date for this period.
     */
    public function startDate(): ?Carbon
    {
        return match ($this) {
            self::TODAY => Carbon::now()->startOfDay(),
            self::WEEK => Carbon::now()->subDays(7),
            self::MONTH => Carbon::now()->subDays(30),
            self::ALL => null,
        };
    }
}
