<?php

use App\Models\User;
use App\Models\Video;
use App\Services\VideoService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoService', function () {
    $service = new VideoService();

    beforeEach(function () use (&$service) {
        $service = new VideoService();
    });

    test('create video stores data correctly', function () use (&$service) {
        $faker = \Faker\Factory::create();
        $user = User::factory()->create();
        $title = $faker->unique()->sentence(3);
        $description = $faker->paragraph();
        $tags = array_slice($faker->words(5), 0, rand(1, 3));
        $status = $faker->randomElement(['published', 'scheduled', 'draft']);

        $data = [
            'title' => $title,
            'description' => $description,
            'tags' => $tags,
            'status' => $status,
        ];

        $video = $service->createVideo($user, $data);

        expect($video->id)->not->toBeNull();
        expect($video->title)->toBe($title);
        expect($video->description)->toBe($description);
        expect($video->channel_id)->toBe($user->id);
        expect($video->status)->toBe($status);
    });

    test('list videos returns paginated results', function () use (&$service) {
        Video::factory(20)->create();

        $result = $service->listVideos([]);

        expect($result->count())->toBe(15);
        expect($result->hasPages())->toBeTrue();
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
        $newStatus = $faker->randomElement(['published', 'scheduled', 'draft']);

        $video = Video::factory()->create(['title' => $oldTitle]);
        $newData = [
            'title' => $newTitle,
            'description' => $newDescription,
            'status' => $newStatus,
        ];

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
});
