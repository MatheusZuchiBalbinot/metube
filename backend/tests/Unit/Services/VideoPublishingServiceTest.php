<?php

declare(strict_types=1);

use App\DTOs\UpdateVideoDTO;
use App\Enums\VideoStatus;
use App\Events\VideoPublished;
use App\Events\VideoStatusUpdated;
use App\Exceptions\VideoNotDraftException;
use App\Models\Video;
use App\Services\VideoPublishingService;
use Faker\Factory;
use Illuminate\Support\Facades\Event;

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

describe('VideoPublishingService — publishVideo', function () {
    test('publishes a draft video and fires the expected events', function () {
        Event::fake([VideoPublished::class, VideoStatusUpdated::class]);
        $video = Video::factory()->draft()->create();

        app(VideoPublishingService::class)->publishVideo($video);

        expect($video->fresh()?->status)->toBe(VideoStatus::PUBLISHED)
            ->and($video->fresh()?->published_at)->not->toBeNull();
        Event::assertDispatched(VideoPublished::class);
        Event::assertDispatched(VideoStatusUpdated::class, fn ($e) => $e->newStatus === VideoStatus::PUBLISHED);
    });

    test('throws VideoNotDraftException when the video is not in draft status', function () {
        $video = Video::factory()->published()->create();

        expect(fn () => app(VideoPublishingService::class)->publishVideo($video))
            ->toThrow(VideoNotDraftException::class);

        expect($video->fresh()?->status)->toBe(VideoStatus::PUBLISHED);
    });

    test('a second publish call on the same video throws instead of double-firing events (simulates two racing requests)', function () {
        Event::fake([VideoPublished::class, VideoStatusUpdated::class]);
        $video = Video::factory()->draft()->create();

        app(VideoPublishingService::class)->publishVideo($video);

        expect(fn () => app(VideoPublishingService::class)->publishVideo($video))
            ->toThrow(VideoNotDraftException::class);

        Event::assertDispatchedTimes(VideoPublished::class, 1);
    });
});

describe('VideoPublishingService — publishDueVideos', function () {
    test('publishes videos whose scheduled_at has passed', function () {
        Event::fake([VideoPublished::class, VideoStatusUpdated::class]);
        $due = Video::factory()->scheduled()->create(['scheduled_at' => now()->subMinute()]);

        $count = app(VideoPublishingService::class)->publishDueVideos();

        expect($count)->toBe(1)
            ->and($due->fresh()?->status)->toBe(VideoStatus::PUBLISHED)
            ->and($due->fresh()?->published_at?->toDateTimeString())->toBe($due->scheduled_at->toDateTimeString());
        Event::assertDispatchedTimes(VideoPublished::class, 1);
    });

    test('does not publish videos scheduled in the future', function () {
        $future = Video::factory()->scheduled()->create(['scheduled_at' => now()->addHour()]);

        $count = app(VideoPublishingService::class)->publishDueVideos();

        expect($count)->toBe(0)
            ->and($future->fresh()?->status)->toBe(VideoStatus::SCHEDULED);
    });

    test('does not affect already published videos', function () {
        $published = Video::factory()->published()->create();

        $count = app(VideoPublishingService::class)->publishDueVideos();

        expect($count)->toBe(0)
            ->and($published->fresh()?->status)->toBe(VideoStatus::PUBLISHED);
    });

    test('publishes multiple due videos in one run', function () {
        Video::factory()->scheduled()->count(3)->create(['scheduled_at' => now()->subMinute()]);

        $count = app(VideoPublishingService::class)->publishDueVideos();

        expect($count)->toBe(3)
            ->and(Video::where('status', VideoStatus::PUBLISHED)->count())->toBe(3);
    });
});
