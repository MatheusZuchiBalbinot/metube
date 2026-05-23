<?php

use App\Data\UpdateVideoData;
use App\Enums\VideoStatus;
use Illuminate\Support\Carbon;

describe('UpdateVideoData', function () {
    test('can be constructed with all nulls', function () {
        $data = new UpdateVideoData(
            title: null,
            description: null,
            tags: null,
            status: null,
            scheduledAt: null,
        );

        expect($data->title)->toBeNull()
            ->and($data->description)->toBeNull()
            ->and($data->tags)->toBeNull()
            ->and($data->status)->toBeNull()
            ->and($data->scheduledAt)->toBeNull();
    });

    test('fromRequest builds from validated array', function () {
        $validated = [
            'title' => 'New Title',
            'description' => 'New Desc',
            'tags' => ['php'],
            'status' => 'published',
        ];

        $data = UpdateVideoData::fromRequest($validated);

        expect($data->title)->toBe('New Title')
            ->and($data->description)->toBe('New Desc')
            ->and($data->tags)->toBe(['php'])
            ->and($data->status)->toBe(VideoStatus::PUBLISHED)
            ->and($data->scheduledAt)->toBeNull();
    });

    test('fromRequest parses scheduledAt', function () {
        $validated = [
            'status' => 'scheduled',
            'scheduled_at' => '2025-12-01T00:00:00Z',
        ];

        $data = UpdateVideoData::fromRequest($validated);

        expect($data->scheduledAt)->toBeInstanceOf(Carbon::class)
            ->and($data->scheduledAt->year)->toBe(2025);
    });

    test('toUpdateArray omits null fields', function () {
        $data = new UpdateVideoData(
            title: null,
            description: null,
            tags: null,
            status: null,
            scheduledAt: null,
        );

        expect($data->toUpdateArray())->toBe([]);
    });

    test('toUpdateArray includes only non-null fields', function () {
        $data = new UpdateVideoData(
            title: 'Updated Title',
            description: null,
            tags: null,
            status: null,
            scheduledAt: null,
        );

        $array = $data->toUpdateArray();

        expect($array)->toHaveKey('title')
            ->and($array)->not->toHaveKey('description')
            ->and($array['title'])->toBe('Updated Title');
    });

    test('toUpdateArray includes all provided fields', function () {
        $scheduledAt = Carbon::parse('2025-10-01');
        $data = new UpdateVideoData(
            title: 'Title',
            description: 'Desc',
            tags: ['a', 'b'],
            status: VideoStatus::DRAFT,
            scheduledAt: $scheduledAt,
        );

        $array = $data->toUpdateArray();

        expect($array)->toHaveKey('title')
            ->and($array)->toHaveKey('description')
            ->and($array)->toHaveKey('tags')
            ->and($array)->toHaveKey('status')
            ->and($array)->toHaveKey('scheduled_at')
            ->and($array['tags'])->toBe(['a', 'b'])
            ->and($array['status'])->toBe(VideoStatus::DRAFT);
    });

    test('all fields are null when constructed with nulls', function () {
        $data = new UpdateVideoData(null, null, null, null, null);

        expect($data->toUpdateArray())->toBeArray()
            ->and($data->toUpdateArray())->toHaveCount(0);
    });
});
