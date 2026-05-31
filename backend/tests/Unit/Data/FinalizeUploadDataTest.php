<?php

declare(strict_types=1);

use App\Data\FinalizeUploadData;
use App\Enums\VideoStatus;
use Illuminate\Support\Carbon;

describe('FinalizeUploadData', function () {
    test('can be constructed directly', function () {
        $data = new FinalizeUploadData(
            uploadKey: 'abc123',
            thumbnailKey: null,
            title: 'My Video',
            description: 'A description',
            tags: ['php', 'laravel'],
            status: VideoStatus::DRAFT,
            scheduledAt: null,
        );

        expect($data->uploadKey)->toBe('abc123')
            ->and($data->title)->toBe('My Video')
            ->and($data->tags)->toBe(['php', 'laravel'])
            ->and($data->status)->toBe(VideoStatus::DRAFT)
            ->and($data->isBatch)->toBeFalse();
    });

    test('fromRequest builds instance from validated array', function () {
        $validated = [
            'upload_key' => 'key-xyz',
            'title' => 'From Request',
            'description' => 'Desc',
            'tags' => ['tag1'],
            'status' => 'published',
        ];

        $data = FinalizeUploadData::fromRequest($validated);

        expect($data->uploadKey)->toBe('key-xyz')
            ->and($data->title)->toBe('From Request')
            ->and($data->status)->toBe(VideoStatus::PUBLISHED)
            ->and($data->thumbnailKey)->toBeNull()
            ->and($data->scheduledAt)->toBeNull()
            ->and($data->isBatch)->toBeFalse();
    });

    test('fromRequest sets thumbnailKey when provided', function () {
        $validated = [
            'upload_key' => 'key-abc',
            'thumbnail_key' => 'thumb-xyz',
            'title' => 'Video',
            'status' => 'draft',
        ];

        $data = FinalizeUploadData::fromRequest($validated);

        expect($data->thumbnailKey)->toBe('thumb-xyz');
    });

    test('fromRequest parses scheduledAt from string', function () {
        $validated = [
            'upload_key' => 'key-abc',
            'title' => 'Scheduled Video',
            'status' => 'scheduled',
            'scheduled_at' => '2025-12-25T10:00:00Z',
        ];

        $data = FinalizeUploadData::fromRequest($validated);

        expect($data->scheduledAt)->toBeInstanceOf(Carbon::class)
            ->and($data->scheduledAt->year)->toBe(2025)
            ->and($data->scheduledAt->month)->toBe(12)
            ->and($data->scheduledAt->day)->toBe(25);
    });

    test('fromRequest sets isBatch when provided', function () {
        $validated = [
            'upload_key' => 'key-abc',
            'title' => 'Batch Video',
            'status' => 'draft',
            'is_batch' => true,
        ];

        $data = FinalizeUploadData::fromRequest($validated);

        expect($data->isBatch)->toBeTrue();
    });

    test('fromRequest defaults tags to empty array when missing', function () {
        $validated = [
            'upload_key' => 'key-abc',
            'title' => 'Video',
            'status' => 'draft',
        ];

        $data = FinalizeUploadData::fromRequest($validated);

        expect($data->tags)->toBe([]);
    });

    test('is readonly and cannot be mutated', function () {
        $data = new FinalizeUploadData(
            uploadKey: 'key',
            thumbnailKey: null,
            title: 'Title',
            description: null,
            tags: [],
            status: VideoStatus::DRAFT,
            scheduledAt: null,
        );

        expect(fn () => $data->uploadKey = 'other')
            ->toThrow(Error::class);
    });
});
