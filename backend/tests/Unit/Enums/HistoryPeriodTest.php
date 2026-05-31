<?php

declare(strict_types=1);

use App\Enums\HistoryPeriod;

describe('HistoryPeriod Enum', function () {
    test('all periods have correct values', function () {
        expect(HistoryPeriod::TODAY->value)->toBe('today');
        expect(HistoryPeriod::WEEK->value)->toBe('week');
        expect(HistoryPeriod::MONTH->value)->toBe('month');
        expect(HistoryPeriod::ALL->value)->toBe('all');
    });

    test('values method returns all period values', function () {
        $values = HistoryPeriod::values();

        expect($values)->toHaveCount(4);
        expect($values)->toContain('today', 'week', 'month', 'all');
    });

    test('start date returns correct date for each period', function () {
        // TODAY
        $today = HistoryPeriod::TODAY->startDate();
        expect($today)->not->toBeNull();
        expect($today->isToday())->toBeTrue();

        // WEEK
        $week = HistoryPeriod::WEEK->startDate();
        expect($week)->not->toBeNull();
        expect($week->isBefore(now()))->toBeTrue();

        // MONTH
        $month = HistoryPeriod::MONTH->startDate();
        expect($month)->not->toBeNull();
        expect($month->isBefore(now()))->toBeTrue();

        // ALL
        $all = HistoryPeriod::ALL->startDate();
        expect($all)->toBeNull();
    });
});
