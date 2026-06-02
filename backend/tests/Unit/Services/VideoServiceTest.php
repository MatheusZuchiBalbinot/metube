<?php

declare(strict_types=1);

use App\DTOs\CreateVideoDTO;
use App\DTOs\UpdateVideoDTO;
use App\DTOs\VideoListFilterDTO;
use App\Enums\VideoStatus;
use App\Events\VideoFinished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Jobs\ProcessVideoUpload;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoProgressService;
use App\Services\VideoPublishingService;
use App\Services\VideoReactionService;
use App\Services\VideoService;
use App\Services\VideoUploadService;
use Faker\Factory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/**
 * Event classes faked together when exercising reaction/progress side effects.
 *
 * @return list<class-string>
 */
function reactionEvents(): array
{
    return [
        VideoUnliked::class,
        VideoUndisliked::class,
        VideoUnsaved::class,
        VideoSaved::class,
        VideoFinished::class,
        VideoReactionApplied::class,
    ];
}

beforeEach(function () {
    Cache::flush();
});

describe('VideoService — read', function () {
    test('list videos returns paginated results', function () {
        Video::factory(20)->create(['status' => VideoStatus::PUBLISHED]);

        $result = app(VideoService::class)->listVideos(new VideoListFilterDTO);

        expect($result->count())->toBe(15);
        expect($result->hasPages())->toBeTrue();
    });

    test('list videos excludes non-published videos', function () {
        Video::factory(3)->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory(2)->create(['status' => VideoStatus::PROCESSING]);
        Video::factory()->create(['status' => VideoStatus::FAILED]);

        $result = app(VideoService::class)->listVideos(new VideoListFilterDTO);

        expect($result->total())->toBe(3);
    });

    test('get video by uuid returns correct video', function () {
        $video = Video::factory()->create();

        $found = app(VideoService::class)->getVideoByUuid($video->vuid);

        expect($found->id)->toBe($video->id);
    });
});

describe('VideoUploadService — create & delete', function () {
    beforeEach(function () {
        Queue::fake();
        Storage::fake('local');
    });

    test('create video stores data correctly and dispatches upload job', function () {
        $faker = Factory::create();
        $user = User::factory()->create();
        $title = $faker->unique()->sentence(3);
        $description = $faker->paragraph();
        $tags = array_slice($faker->words(5), 0, rand(1, 3));

        $data = new CreateVideoDTO(
            title: $title,
            description: $description,
            tags: $tags,
            status: VideoStatus::DRAFT,
            videoFile: UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4'),
            thumbnailFile: null,
            scheduledAt: null,
        );

        $video = app(VideoUploadService::class)->createVideo($user, $data);

        expect($video->id)->not->toBeNull()
            ->and($video->title)->toBe($title)
            ->and($video->description)->toBe($description)
            ->and($video->channel_id)->toBe($user->id)
            ->and($video->status)->toBe(VideoStatus::PROCESSING);

        Queue::assertPushed(ProcessVideoUpload::class);
    });

    test('delete video removes it from database', function () {
        $video = Video::factory()->create();
        $videoId = $video->id;

        app(VideoUploadService::class)->deleteVideo($video);

        $this->assertDatabaseMissing('videos', ['id' => $videoId]);
    });
});

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

describe('VideoReactionService — views & reactions', function () {
    test('record view increments view count', function () {
        $user = User::factory()->create();
        $initialViews = rand(0, 10000);
        $video = Video::factory()->create(['views' => $initialViews]);

        app(VideoReactionService::class)->recordView($user, $video);

        $video->refresh();
        expect($video->views)->toBe($initialViews + 1);
    });

    test('toggle like creates reaction', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        app(VideoReactionService::class)->toggleLike($user, $video);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('toggle like removes reaction if already liked', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        app(VideoReactionService::class)->toggleLike($user, $video);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeFalse();
    });

    test('toggle like dispatches VideoUnliked when removing existing like', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        app(VideoReactionService::class)->toggleLike($user, $video);

        Event::assertDispatched(VideoUnliked::class);
        Event::assertNotDispatched(VideoReactionApplied::class);
    });

    test('toggle like dispatches VideoUndisliked then VideoReactionApplied when switching from dislike', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'dislike']);

        app(VideoReactionService::class)->toggleLike($user, $video);

        Event::assertDispatched(VideoUndisliked::class);
        Event::assertDispatched(VideoReactionApplied::class);
    });

    test('toggle dislike dispatches VideoUnliked when switching from like', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        app(VideoReactionService::class)->toggleDislike($user, $video);

        Event::assertDispatched(VideoUnliked::class);
        Event::assertDispatched(VideoReactionApplied::class);
    });

    test('toggle save dispatches VideoSaved on add and VideoUnsaved on remove', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $reactions = app(VideoReactionService::class);

        $reactions->toggleSave($user, $video);
        Event::assertDispatched(VideoSaved::class);

        $reactions->toggleSave($user, $video);
        Event::assertDispatched(VideoUnsaved::class);
    });
});

describe('VideoProgressService — progress', function () {
    test('updateProgress dispatches VideoFinished only on first crossing of 95 percent', function () {
        Event::fake(reactionEvents());

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $progress = app(VideoProgressService::class);

        $progress->updateProgress($user, $video, 50);
        Event::assertNotDispatched(VideoFinished::class);

        $progress->updateProgress($user, $video, 96);
        Event::assertDispatchedTimes(VideoFinished::class, 1);

        $progress->updateProgress($user, $video, 99);
        Event::assertDispatchedTimes(VideoFinished::class, 1);
    });
});
