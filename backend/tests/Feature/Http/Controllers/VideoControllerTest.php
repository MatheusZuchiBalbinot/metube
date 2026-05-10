<?php

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

describe('VideoController', function () {
    test('index returns paginated videos', function () {
        $user = User::factory()->create();
        Video::factory(5)->create();

        $response = $this->actingAs($user)->getJson('/api/videos');

        $response->assertOk();
        $response->assertJsonCount(5, 'data');
    });

    test('show returns specific video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        $response = $this->actingAs($user)->getJson("/api/videos/{$video->vuid}");

        $response->assertOk();
        $response->assertJsonPath('vuid', $video->vuid);
    });

    test('store creates new video when authorized', function () {
        Queue::fake();
        Storage::fake('local');

        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/videos', [
            'title' => 'New Video',
            'description' => 'Test Description',
            'status' => 'draft',
            'video_file' => UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4'),
        ]);

        $response->assertStatus(202);
        $this->assertDatabaseHas('videos', ['title' => 'New Video']);
    });

    test('update modifies video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $response = $this->actingAs($user)->patchJson("/api/videos/{$video->vuid}", [
            'title' => 'Updated Title',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('videos', ['id' => $video->id, 'title' => 'Updated Title']);
    });

    test('destroy deletes video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $videoId = $video->id;

        $response = $this->actingAs($user)->deleteJson("/api/videos/{$video->vuid}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('videos', ['id' => $videoId]);
    });

    test('toggle like creates like reaction', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/like");

        $response->assertNoContent();
        expect($user->likes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('record view increments view count and creates history entry', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['views' => 0]);

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/views");

        $response->assertNoContent();
        $this->assertDatabaseHas('videos', ['id' => $video->id, 'views' => 1]);
        $this->assertDatabaseHas('watch_histories', ['user_id' => $user->id, 'video_id' => $video->id]);
    });

    test('record view is ignored within one hour for the same user and video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['views' => 0]);

        $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/views");
        $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/views");

        $this->assertDatabaseHas('videos', ['id' => $video->id, 'views' => 1]);
        expect($user->history()->where('video_id', $video->id)->count())->toBe(1);
    });

    test('update progress saves watch progress', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/videos/{$video->vuid}/progress", [
            'percent' => 50,
        ]);

        $response->assertNoContent();
        $this->assertDatabaseHas('video_progress', [
            'user_id' => $user->id,
            'video_id' => $video->id,
            'percent' => 50,
        ]);
    });

    test('index filters videos by search term on title', function () {
        $user = User::factory()->create();
        Video::factory()->create(['title' => 'Laravel Tutorial', 'description' => 'intro', 'tags' => []]);
        Video::factory()->create(['title' => 'Vue Guide', 'description' => 'intro', 'tags' => []]);

        $response = $this->actingAs($user)->getJson('/api/videos?search=laravel');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Laravel Tutorial');
    });

    test('index filters videos by search term on description', function () {
        $user = User::factory()->create();
        Video::factory()->create(['title' => 'Video A', 'description' => 'deep dive into testing', 'tags' => []]);
        Video::factory()->create(['title' => 'Video B', 'description' => 'unrelated content', 'tags' => []]);

        $response = $this->actingAs($user)->getJson('/api/videos?search=testing');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Video A');
    });

    test('index filters videos by search term on tags', function () {
        $user = User::factory()->create();
        Video::factory()->create(['title' => 'Video A', 'description' => '', 'tags' => ['php', 'backend']]);
        Video::factory()->create(['title' => 'Video B', 'description' => '', 'tags' => ['javascript']]);

        $response = $this->actingAs($user)->getJson('/api/videos?search=php');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Video A');
    });

    test('index returns all videos when no search term provided', function () {
        $user = User::factory()->create();
        Video::factory(3)->create();

        $response = $this->actingAs($user)->getJson('/api/videos');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    });
});
