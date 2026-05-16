<?php

use App\Data\CreateVideoData;
use App\Data\UpdateVideoData;
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
use App\Services\VideoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

describe('VideoService', function () {
    $service = new VideoService;

    beforeEach(function () use (&$service) {
        Cache::flush();
        $service = new VideoService;

        Queue::fake();
        Storage::fake('local');
    });

    test('create video stores data correctly and dispatches upload job', function () use (&$service) {
        $faker = \Faker\Factory::create();
        $user = User::factory()->create();
        $title = $faker->unique()->sentence(3);
        $description = $faker->paragraph();
        $tags = array_slice($faker->words(5), 0, rand(1, 3));

        $data = new CreateVideoData(
            title: $title,
            description: $description,
            tags: $tags,
            status: VideoStatus::DRAFT,
            videoFile: UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4'),
            thumbnailFile: null,
            scheduledAt: null,
        );

        $video = $service->createVideo($user, $data);

        expect($video->id)->not->toBeNull()
            ->and($video->title)->toBe($title)
            ->and($video->description)->toBe($description)
            ->and($video->channel_id)->toBe($user->id)
            ->and($video->status)->toBe(VideoStatus::PROCESSING);

        Queue::assertPushed(ProcessVideoUpload::class);
    });

    test('list videos returns paginated results', function () use (&$service) {
        Video::factory(20)->create(['status' => VideoStatus::PUBLISHED]);

        $result = $service->listVideos([]);

        expect($result->count())->toBe(15);
        expect($result->hasPages())->toBeTrue();
    });

    test('list videos excludes non-published videos', function () use (&$service) {
        Video::factory(3)->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory(2)->create(['status' => VideoStatus::PROCESSING]);
        Video::factory()->create(['status' => VideoStatus::FAILED]);

        $result = $service->listVideos([]);

        expect($result->total())->toBe(3);
    });

    test('get video by uuid returns correct video', function () use (&$service) {
        $video = Video::factory()->create();

        $found = $service->getVideoByUuid($video->vuid);

        expect($found->id)->toBe($video->id);
    });

    test('update video changes attributes', function () use (&$service) {
        $faker = \Faker\Factory::create();
        $oldTitle = $faker->sentence(2);
        $newTitle = $faker->sentence(2);
        $newDescription = $faker->paragraph();
        $newStatus = $faker->randomElement(VideoStatus::cases());

        $video = Video::factory()->create(['title' => $oldTitle]);
        $newData = new UpdateVideoData(
            title: $newTitle,
            description: $newDescription,
            tags: null,
            status: $newStatus,
            scheduledAt: null,
        );

        $updated = $service->updateVideo($video, $newData);

        expect($updated->title)->toBe($newTitle);
        expect($updated->description)->toBe($newDescription);
        expect($updated->status)->toBe($newStatus);
        $this->assertDatabaseHas('videos', ['id' => $video->id, 'title' => $newTitle]);
    });

    test('delete video removes it from database', function () use (&$service) {
        $video = Video::factory()->create();
        $videoId = $video->id;

        $service->deleteVideo($video);

        $this->assertDatabaseMissing('videos', ['id' => $videoId]);
    });

    test('record view increments view count', function () use (&$service) {
        $user = User::factory()->create();
        $initialViews = rand(0, 10000);
        $video = Video::factory()->create(['views' => $initialViews]);

        $service->recordView($user, $video);

        $video->refresh();
        expect($video->views)->toBe($initialViews + 1);
    });

    test('toggle like creates reaction', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $service->toggleLike($user, $video);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('toggle like removes reaction if already liked', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        $service->toggleLike($user, $video);

        expect($user->likes()->where('video_id', $video->id)->exists())->toBeFalse();
    });

    test('toggle like dispatches VideoUnliked when removing existing like', function () use (&$service) {
        Event::fake([
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoReactionApplied::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        $service->toggleLike($user, $video);

        Event::assertDispatched(VideoUnliked::class);
        Event::assertNotDispatched(VideoReactionApplied::class);
    });

    test('toggle like dispatches VideoUndisliked then VideoReactionApplied when switching from dislike', function () use (&$service) {
        Event::fake([
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoReactionApplied::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'dislike']);

        $service->toggleLike($user, $video);

        Event::assertDispatched(VideoUndisliked::class);
        Event::assertDispatched(VideoReactionApplied::class);
    });

    test('toggle dislike dispatches VideoUnliked when switching from like', function () use (&$service) {
        Event::fake([
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoReactionApplied::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();
        $user->reactions()->attach($video->id, ['type' => 'like']);

        $service->toggleDislike($user, $video);

        Event::assertDispatched(VideoUnliked::class);
        Event::assertDispatched(VideoReactionApplied::class);
    });

    test('toggle save dispatches VideoSaved on add and VideoUnsaved on remove', function () use (&$service) {
        Event::fake([
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoReactionApplied::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        $service->toggleSave($user, $video);
        Event::assertDispatched(VideoSaved::class);

        $service->toggleSave($user, $video);
        Event::assertDispatched(VideoUnsaved::class);
    });

    test('updateProgress dispatches VideoFinished only on first crossing of 95 percent', function () use (&$service) {
        Event::fake([
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoReactionApplied::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        $service->updateProgress($user, $video, 50);
        Event::assertNotDispatched(VideoFinished::class);

        $service->updateProgress($user, $video, 96);
        Event::assertDispatchedTimes(VideoFinished::class, 1);

        $service->updateProgress($user, $video, 99);
        Event::assertDispatchedTimes(VideoFinished::class, 1);
    });
});
