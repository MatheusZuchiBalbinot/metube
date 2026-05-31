<?php

declare(strict_types=1);

use App\Enums\PlaylistName;

describe('PlaylistName', function () {
    test('WATCH_LATER has correct string value', function () {
        expect(PlaylistName::WATCH_LATER->value)->toBe('Watch Later');
    });

    test('values() returns all enum string values', function () {
        $values = PlaylistName::values();

        expect($values)->toBeArray()
            ->and($values)->toContain('Watch Later');
    });

    test('values() count matches total cases', function () {
        expect(PlaylistName::values())->toHaveCount(count(PlaylistName::cases()));
    });

    test('can be instantiated from string', function () {
        $case = PlaylistName::from('Watch Later');

        expect($case)->toBe(PlaylistName::WATCH_LATER);
    });

    test('tryFrom returns null for unknown value', function () {
        $case = PlaylistName::tryFrom('Unknown Playlist');

        expect($case)->toBeNull();
    });
});
