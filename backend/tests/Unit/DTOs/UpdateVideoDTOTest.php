<?php

declare(strict_types=1);

use App\DTOs\UpdateVideoDTO;
use Illuminate\Support\Carbon;

describe('UpdateVideoDTO', function () {
    test('can be constructed with all nulls', function () {
        $data = new UpdateVideoDTO(
            title: null,
            description: null,
            tags: null,
            scheduledAt: null,
        );

        expect($data->title)->toBeNull()
            ->and($data->description)->toBeNull()
            ->and($data->tags)->toBeNull()
            ->and($data->scheduledAt)->toBeNull();
    });

    test('fromRequest builds from validated array', function () {
        $validated = [
            'title' => 'New Title',
            'description' => 'New Desc',
            'tags' => ['php'],
        ];

        $data = UpdateVideoDTO::fromRequest($validated);

        expect($data->title)->toBe('New Title')
            ->and($data->description)->toBe('New Desc')
            ->and($data->tags)->toBe(['php'])
            ->and($data->scheduledAt)->toBeNull();
    });

    test('fromRequest ignores a status key even if present in the array', function () {
        // fromRequest must not resurrect `status` even if present in the raw array.
        $validated = [
            'title' => 'New Title',
            'status' => 'published',
        ];

        $data = UpdateVideoDTO::fromRequest($validated);

        expect($data->title)->toBe('New Title');
    });

    test('fromRequest parses scheduledAt', function () {
        $validated = [
            'scheduled_at' => '2025-12-01T00:00:00Z',
        ];

        $data = UpdateVideoDTO::fromRequest($validated);

        expect($data->scheduledAt)->toBeInstanceOf(Carbon::class)
            ->and($data->scheduledAt->year)->toBe(2025);
    });

    test('toUpdateArray omits null fields', function () {
        $data = new UpdateVideoDTO(
            title: null,
            description: null,
            tags: null,
            scheduledAt: null,
        );

        expect($data->toUpdateArray())->toBe([]);
    });

    test('toUpdateArray includes only non-null fields', function () {
        $data = new UpdateVideoDTO(
            title: 'Updated Title',
            description: null,
            tags: null,
            scheduledAt: null,
        );

        $array = $data->toUpdateArray();

        expect($array)->toHaveKey('title')
            ->and($array)->not->toHaveKey('description')
            ->and($array['title'])->toBe('Updated Title');
    });

    test('toUpdateArray includes all provided fields', function () {
        $scheduledAt = Carbon::parse('2025-10-01');
        $data = new UpdateVideoDTO(
            title: 'Title',
            description: 'Desc',
            tags: ['a', 'b'],
            scheduledAt: $scheduledAt,
        );

        $array = $data->toUpdateArray();

        expect($array)->toHaveKey('title')
            ->and($array)->toHaveKey('description')
            ->and($array)->toHaveKey('tags')
            ->and($array)->toHaveKey('scheduled_at')
            ->and($array)->not->toHaveKey('status')
            ->and($array['tags'])->toBe(['a', 'b']);
    });

    test('all fields are null when constructed with nulls', function () {
        $data = new UpdateVideoDTO(null, null, null, null);

        expect($data->toUpdateArray())->toBeArray()
            ->and($data->toUpdateArray())->toHaveCount(0);
    });
});
