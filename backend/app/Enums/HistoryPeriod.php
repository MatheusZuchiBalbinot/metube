<?php

declare(strict_types=1);

namespace App\Enums;

use Illuminate\Support\Carbon;

enum HistoryPeriod: string
{
    case TODAY = 'today';
    case WEEK = 'week';
    case MONTH = 'month';
    case ALL = 'all';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

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
