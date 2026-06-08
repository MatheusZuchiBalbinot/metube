<?php

declare(strict_types=1);

use App\Enums\TranscriptionStatus;
use App\Enums\VideoStatus;
use App\Jobs\TranscribeVideo;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

describe('VideoController', function () {
    test('index returns paginated videos', function () {
        $user = User::factory()->create();
        Video::factory(5)->create(['status' => VideoStatus::PUBLISHED]);

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
        Video::factory()->create(['title' => 'Laravel Tutorial', 'description' => 'intro', 'tags' => [], 'status' => VideoStatus::PUBLISHED]);
        Video::factory()->create(['title' => 'Vue Guide', 'description' => 'intro', 'tags' => [], 'status' => VideoStatus::PUBLISHED]);

        $response = $this->actingAs($user)->getJson('/api/videos?search=laravel');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Laravel Tutorial');
    });

    test('index filters videos by search term on description', function () {
        $user = User::factory()->create();
        Video::factory()->create(['title' => 'Video A', 'description' => 'deep dive into testing', 'tags' => [], 'status' => VideoStatus::PUBLISHED]);
        Video::factory()->create(['title' => 'Video B', 'description' => 'unrelated content', 'tags' => [], 'status' => VideoStatus::PUBLISHED]);

        $response = $this->actingAs($user)->getJson('/api/videos?search=testing');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Video A');
    });

    test('index filters videos by tags filter (OR semantics)', function () {
        $user = User::factory()->create();
        Video::factory()->create(['title' => 'Video A', 'description' => '', 'tags' => ['php', 'backend'], 'status' => VideoStatus::PUBLISHED]);
        Video::factory()->create(['title' => 'Video B', 'description' => '', 'tags' => ['javascript'], 'status' => VideoStatus::PUBLISHED]);

        $response = $this->actingAs($user)->getJson('/api/videos?tags[]=php');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Video A');
    });

    test('index returns all videos when no search term provided', function () {
        $user = User::factory()->create();
        Video::factory(3)->create(['status' => VideoStatus::PUBLISHED]);

        $response = $this->actingAs($user)->getJson('/api/videos');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    });

    test('index does not return processing or draft videos', function () {
        $user = User::factory()->create();
        Video::factory()->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory()->create(['status' => VideoStatus::PROCESSING]);
        Video::factory()->create(['status' => VideoStatus::DRAFT]);
        Video::factory()->create(['status' => VideoStatus::FAILED]);

        $response = $this->actingAs($user)->getJson('/api/videos');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    });

    test('transcription returns 404 when no transcription exists', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create();

        $response = $this->actingAs($user)->getJson("/api/videos/{$video->vuid}/transcription");

        $response->assertStatus(404);
    });

    test('transcription returns status and null content when processing', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create();
        Transcription::create([
            'video_id' => $video->id,
            'status' => TranscriptionStatus::PROCESSING,
        ]);

        $response = $this->actingAs($user)->getJson("/api/videos/{$video->vuid}/transcription");

        $response->assertOk();
        $response->assertJsonPath('status', 'processing');
        $response->assertJsonPath('content', null);
    });

    test('transcription returns content when completed', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create();
        Transcription::create([
            'video_id' => $video->id,
            'status' => TranscriptionStatus::COMPLETED,
            'language' => 'pt',
            'content' => 'Olá mundo',
        ]);

        $response = $this->actingAs($user)->getJson("/api/videos/{$video->vuid}/transcription");

        $response->assertOk();
        $response->assertJsonPath('status', 'completed');
        $response->assertJsonPath('language', 'pt');
        $response->assertJsonPath('content', 'Olá mundo');
    });

    test('retry transcription resets status and dispatches job for owner', function () {
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->published()->for($user, 'channel')->create();
        Transcription::create([
            'video_id' => $video->id,
            'status' => TranscriptionStatus::FAILED,
            'content' => null,
            'language' => null,
        ]);

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/transcription/retry");

        $response->assertNoContent();
        $this->assertDatabaseHas('transcriptions', [
            'video_id' => $video->id,
            'status' => TranscriptionStatus::PENDING->value,
        ]);
        Queue::assertPushed(TranscribeVideo::class);
    });

    test('retry transcription returns 403 for non-owner', function () {
        Queue::fake();

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->published()->for($owner, 'channel')->create();

        $response = $this->actingAs($other)->postJson("/api/videos/{$video->vuid}/transcription/retry");

        $response->assertForbidden();
        Queue::assertNothingPushed();
    });

    test('retry transcription creates transcription record if none exists', function () {
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->published()->for($user, 'channel')->create();

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/transcription/retry");

        $response->assertNoContent();
        $this->assertDatabaseHas('transcriptions', [
            'video_id' => $video->id,
            'status' => TranscriptionStatus::PENDING->value,
        ]);
    });

    test('index is accessible to guests', function () {
        $response = $this->getJson('/api/videos');
        $response->assertOk();
    });

    test('show is accessible for published videos as guest', function () {
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);
        $response = $this->getJson("/api/videos/{$video->vuid}");
        $response->assertOk();
    });

    test('show returns 404 for non-existent video', function () {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/videos/nonexistent-vuid');
        $response->assertNotFound();
    });

    test('update returns 401 for unauthenticated request', function () {
        $video = Video::factory()->create();
        $response = $this->patchJson("/api/videos/{$video->vuid}", ['title' => 'X']);
        $response->assertUnauthorized();
    });

    test('update returns 403 when non-owner tries to edit', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();

        $response = $this->actingAs($other)->patchJson("/api/videos/{$video->vuid}", [
            'title' => 'Hijacked',
        ]);

        $response->assertForbidden();
    });

    test('update returns 404 for non-existent video', function () {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->patchJson('/api/videos/nonexistent-vuid', ['title' => 'X']);
        $response->assertNotFound();
    });

    test('destroy returns 401 for unauthenticated request', function () {
        $video = Video::factory()->create();
        $response = $this->deleteJson("/api/videos/{$video->vuid}");
        $response->assertUnauthorized();
    });

    test('destroy returns 403 when non-owner tries to delete', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();

        $response = $this->actingAs($other)->deleteJson("/api/videos/{$video->vuid}");

        $response->assertForbidden();
        $this->assertDatabaseHas('videos', ['id' => $video->id]);
    });

    test('destroy returns 404 for non-existent video', function () {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->deleteJson('/api/videos/nonexistent-vuid');
        $response->assertNotFound();
    });

    test('store returns 422 when title is missing', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/videos', [
            'status' => 'draft',
            'upload_key' => 'some-key',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['title']);
    });

    test('store returns 422 when status is invalid', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/videos', [
            'title' => 'Test',
            'status' => 'invalid-status',
            'upload_key' => 'some-key',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['status']);
    });

    test('store returns 422 when neither video_file nor upload_key provided', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/videos', [
            'title' => 'Test',
            'status' => 'draft',
        ]);

        $response->assertUnprocessable();
    });

    test('updateProgress returns 422 when percent exceeds 100', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/videos/{$video->vuid}/progress", [
            'percent' => 101,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['percent']);
    });

    test('updateProgress returns 422 when percent is negative', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/videos/{$video->vuid}/progress", [
            'percent' => -1,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['percent']);
    });

    test('updateProgress returns 422 when percent is missing', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/videos/{$video->vuid}/progress", []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['percent']);
    });

    test('publish returns 200 and sets status to PUBLISHED for owner of draft video', function () {
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->draft()->for($user, 'channel')->create();

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/publish");

        $response->assertOk();
        $response->assertJsonPath('status', VideoStatus::PUBLISHED->value);
        $this->assertDatabaseHas('videos', [
            'id' => $video->id,
            'status' => VideoStatus::PUBLISHED->value,
        ]);
    });

    test('publish returns 401 for unauthenticated request', function () {
        $video = Video::factory()->draft()->create();

        $this->postJson("/api/videos/{$video->vuid}/publish")->assertUnauthorized();
    });

    test('publish returns 403 for non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)
            ->postJson("/api/videos/{$video->vuid}/publish")
            ->assertForbidden();
    });

    test('publish returns 409 when video is not in draft status', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->for($user, 'channel')->create();

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/publish")
            ->assertStatus(409);
    });
});

describe('VideoController related', function () {
    test('returns videos related to the given video', function () {
        $creator = User::factory()->create();
        $source = Video::factory()->published()->for($creator, 'channel')->create(['tags' => ['react']]);
        Video::factory()->count(2)->published()->for($creator, 'channel')->create(['tags' => ['react']]);

        $response = $this->actingAs($creator)->getJson("/api/videos/{$source->vuid}/related");

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $vuids = collect($response->json('data'))->pluck('vuid');
        expect($vuids)->not->toContain($source->vuid);
    });

    test('returns an empty list when no other videos exist', function () {
        $creator = User::factory()->create();
        $source = Video::factory()->published()->for($creator, 'channel')->create();

        $response = $this->actingAs($creator)->getJson("/api/videos/{$source->vuid}/related");

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    });
});
