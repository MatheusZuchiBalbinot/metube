<?php

use App\Data\CreateVideoData;
use App\Enums\VideoStatus;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;

describe('CreateVideoData', function () {
    test('can be constructed directly', function () {
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $data = new CreateVideoData(
            title: 'My Video',
            description: 'A description',
            tags: ['php', 'laravel'],
            status: VideoStatus::DRAFT,
            videoFile: $file,
            thumbnailFile: null,
            scheduledAt: null,
        );

        expect($data->title)->toBe('My Video')
            ->and($data->description)->toBe('A description')
            ->and($data->tags)->toBe(['php', 'laravel'])
            ->and($data->status)->toBe(VideoStatus::DRAFT)
            ->and($data->thumbnailFile)->toBeNull()
            ->and($data->scheduledAt)->toBeNull()
            ->and($data->isBatch)->toBeFalse();
    });

    test('fromRequest builds instance from validated array', function () {
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');
        $validated = [
            'title' => 'From Request',
            'description' => 'Desc',
            'tags' => ['tag1', 'tag2'],
            'status' => 'published',
            'video_file' => $file,
        ];

        $data = CreateVideoData::fromRequest($validated);

        expect($data->title)->toBe('From Request')
            ->and($data->description)->toBe('Desc')
            ->and($data->tags)->toBe(['tag1', 'tag2'])
            ->and($data->status)->toBe(VideoStatus::PUBLISHED)
            ->and($data->thumbnailFile)->toBeNull()
            ->and($data->scheduledAt)->toBeNull();
    });

    test('fromRequest parses scheduledAt from string', function () {
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');
        $validated = [
            'title' => 'Scheduled',
            'status' => 'scheduled',
            'video_file' => $file,
            'scheduled_at' => '2025-08-01T09:00:00Z',
        ];

        $data = CreateVideoData::fromRequest($validated);

        expect($data->scheduledAt)->toBeInstanceOf(Carbon::class)
            ->and($data->scheduledAt->year)->toBe(2025);
    });

    test('fromRequest sets thumbnailFile when provided', function () {
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');
        $thumb = UploadedFile::fake()->create('thumb.jpg', 100, 'image/jpeg');
        $validated = [
            'title' => 'With Thumb',
            'status' => 'draft',
            'video_file' => $file,
            'thumbnail_file' => $thumb,
        ];

        $data = CreateVideoData::fromRequest($validated);

        expect($data->thumbnailFile)->not->toBeNull();
    });

    test('fromRequest defaults tags to empty array when missing', function () {
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');
        $validated = [
            'title' => 'No Tags',
            'status' => 'draft',
            'video_file' => $file,
        ];

        $data = CreateVideoData::fromRequest($validated);

        expect($data->tags)->toBe([]);
    });

    test('fromRequest defaults description to null when missing', function () {
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');
        $validated = [
            'title' => 'No Desc',
            'status' => 'draft',
            'video_file' => $file,
        ];

        $data = CreateVideoData::fromRequest($validated);

        expect($data->description)->toBeNull();
    });

    test('videoFile is stored on the DTO', function () {
        $file = UploadedFile::fake()->create('video.mp4', 512, 'video/mp4');
        $data = new CreateVideoData(
            title: 'Title',
            description: null,
            tags: [],
            status: VideoStatus::DRAFT,
            videoFile: $file,
            thumbnailFile: null,
            scheduledAt: null,
        );

        expect($data->videoFile)->toBe($file);
    });
});
