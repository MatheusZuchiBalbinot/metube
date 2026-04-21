<?php

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/videos', [
            'title' => 'New Video',
            'description' => 'Test Description',
            'status' => VideoStatus::PUBLISHED->value,
        ]);

        $response->assertCreated();
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
});
