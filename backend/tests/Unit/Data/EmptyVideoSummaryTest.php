<?php

declare(strict_types=1);

use App\DTOs\EmptyVideoSummary;

describe('EmptyVideoSummary', function () {
    test('key_points is an empty array', function () {
        $summary = new EmptyVideoSummary;

        expect($summary->key_points)->toBe([]);
    });

    test('chapters is an empty array', function () {
        $summary = new EmptyVideoSummary;

        expect($summary->chapters)->toBe([]);
    });

    test('reading_mode is an empty string', function () {
        $summary = new EmptyVideoSummary;

        expect($summary->reading_mode)->toBe('');
    });

    test('two instances are equal', function () {
        $a = new EmptyVideoSummary;
        $b = new EmptyVideoSummary;

        expect($a->key_points)->toEqual($b->key_points)
            ->and($a->chapters)->toEqual($b->chapters)
            ->and($a->reading_mode)->toBe($b->reading_mode);
    });
});
