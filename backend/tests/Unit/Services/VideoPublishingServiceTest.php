<?php

declare(strict_types=1);

use App\DTOs\UpdateVideoDTO;
use App\Enums\VideoStatus;
use App\Models\Video;
use App\Services\VideoPublishingService;
use Faker\Factory;

describe('VideoPublishingService — update', function () {
    test('update video changes attributes', function () {
        $faker = Factory::create();
        $oldTitle = $faker->sentence(2);
        $newTitle = $faker->sentence(2);
        $newDescription = $faker->paragraph();
        $newStatus = $faker->randomElement(VideoStatus::cases());

        $video = Video::factory()->create(['title' => $oldTitle]);
        $newData = new UpdateVideoDTO(
            title: $newTitle,
            description: $newDescription,
            tags: null,
            status: $newStatus,
            scheduledAt: null,
        );

        $updated = app(VideoPublishingService::class)->updateVideo($video, $newData);

        expect($updated->title)->toBe($newTitle);
        expect($updated->description)->toBe($newDescription);
        expect($updated->status)->toBe($newStatus);
        $this->assertDatabaseHas('videos', ['id' => $video->id, 'title' => $newTitle]);
    });
});
