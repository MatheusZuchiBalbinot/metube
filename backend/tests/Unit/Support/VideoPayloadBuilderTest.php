<?php

declare(strict_types=1);

use App\DTOs\CreateVideoDTO;
use App\DTOs\FinalizeUploadDTO;
use App\Enums\VideoStatus;
use App\Models\User;
use App\Support\VideoPayloadBuilder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;

describe('VideoPayloadBuilder', function () {
    test('fromCreateDTO maps the DTO fields and forces PROCESSING status', function () {
        $user = new User;
        $user->id = 7;
        $scheduledAt = Carbon::parse('2026-06-10 12:00:00');

        $dto = new CreateVideoDTO(
            title: 'My Video',
            description: 'A description',
            tags: ['intro', 'laravel'],
            status: VideoStatus::DRAFT,
            videoFile: UploadedFile::fake()->create('video.mp4'),
            thumbnailFile: null,
            scheduledAt: $scheduledAt,
            isBatch: true,
        );

        $payload = VideoPayloadBuilder::fromCreateDTO($user, $dto);

        expect($payload)->toBe([
            'channel_id' => 7,
            'title' => 'My Video',
            'description' => 'A description',
            'tags' => ['intro', 'laravel'],
            'status' => VideoStatus::PROCESSING,
            'scheduled_at' => $scheduledAt,
            'is_batch' => true,
        ]);
    });

    test('fromFinalizeDTO maps the DTO fields and forces PROCESSING status', function () {
        $user = new User;
        $user->id = 9;

        $dto = new FinalizeUploadDTO(
            uploadKey: 'upload-key',
            thumbnailKey: null,
            title: 'Finalized Video',
            description: null,
            tags: [],
            status: VideoStatus::PUBLISHED,
            scheduledAt: null,
            isBatch: false,
        );

        $payload = VideoPayloadBuilder::fromFinalizeDTO($user, $dto);

        expect($payload)->toBe([
            'channel_id' => 9,
            'title' => 'Finalized Video',
            'description' => null,
            'tags' => [],
            'status' => VideoStatus::PROCESSING,
            'scheduled_at' => null,
            'is_batch' => false,
        ]);
    });
});
