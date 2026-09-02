<?php

declare(strict_types=1);

use App\DTOs\UpdateVideoDTO;
use App\Models\Video;
use App\Services\VideoPublishingService;
use Faker\Factory;

describe('VideoPublishingService — update', function () {
    test('update video changes attributes', function () {
        $faker = Factory::create();
        $oldTitle = $faker->sentence(2);
        $newTitle = $faker->sentence(2);
        $newDescription = $faker->paragraph();

        $video = Video::factory()->create(['title' => $oldTitle]);
        $originalStatus = $video->status;
        $newData = new UpdateVideoDTO(
            title: $newTitle,
            description: $newDescription,
            tags: null,
            scheduledAt: null,
        );

        $updated = app(VideoPublishingService::class)->updateVideo($video, $newData);

        expect($updated->title)->toBe($newTitle);
        expect($updated->description)->toBe($newDescription);
        // updateVideo() no longer accepts a status field.
        expect($updated->status)->toBe($originalStatus);
        $this->assertDatabaseHas('videos', ['id' => $video->id, 'title' => $newTitle]);
    });
});
