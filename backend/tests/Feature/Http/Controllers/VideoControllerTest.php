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
        $video = Video::factory()->published()->create();

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/like");

        $response->assertNoContent();
        expect($user->likes()->where('video_id', $video->id)->exists())->toBeTrue();
    });

    test('record view increments view count and creates history entry', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create(['views' => 0]);

        $response = $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/views");

        $response->assertNoContent();
        $this->assertDatabaseHas('videos', ['id' => $video->id, 'views' => 1]);
        $this->assertDatabaseHas('watch_histories', ['user_id' => $user->id, 'video_id' => $video->id]);
    });

    test('record view is ignored within one hour for the same user and video', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create(['views' => 0]);

        $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/views");
        $this->actingAs($user)->postJson("/api/videos/{$video->vuid}/views");

        $this->assertDatabaseHas('videos', ['id' => $video->id, 'views' => 1]);
        expect($user->history()->where('video_id', $video->id)->count())->toBe(1);
    });

    test('update progress saves watch progress', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create();

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
        $video = Video::factory()->published()->create();

        $response = $this->actingAs($user)->putJson("/api/videos/{$video->vuid}/progress", [
            'percent' => 101,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['percent']);
    });

    test('updateProgress returns 422 when percent is negative', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create();

        $response = $this->actingAs($user)->putJson("/api/videos/{$video->vuid}/progress", [
            'percent' => -1,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['percent']);
    });

    test('updateProgress returns 422 when percent is missing', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->create();

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

describe('VideoController subresource authorization', function () {
    test('guest is forbidden from viewing summary of a draft video', function () {
        $video = Video::factory()->draft()->create();

        $this->getJson("/api/videos/{$video->vuid}/summary")->assertForbidden();
    });

    test('guest is forbidden from viewing transcription of a draft video', function () {
        $video = Video::factory()->draft()->create();

        $this->getJson("/api/videos/{$video->vuid}/transcription")->assertForbidden();
    });

    test('guest is forbidden from viewing related videos of a draft video', function () {
        $video = Video::factory()->draft()->create();

        $this->getJson("/api/videos/{$video->vuid}/related")->assertForbidden();
    });

    test('guest is forbidden from listing comments of a draft video', function () {
        $video = Video::factory()->draft()->create();

        $this->getJson("/api/videos/{$video->vuid}/comments")->assertForbidden();
    });

    test('non-owner is forbidden from viewing summary of a draft video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)
            ->getJson("/api/videos/{$video->vuid}/summary")
            ->assertForbidden();
    });

    test('non-owner is forbidden from viewing transcription of a draft video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)
            ->getJson("/api/videos/{$video->vuid}/transcription")
            ->assertForbidden();
    });

    test('non-owner is forbidden from viewing related of a draft video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)
            ->getJson("/api/videos/{$video->vuid}/related")
            ->assertForbidden();
    });

    test('non-owner is forbidden from listing comments of a draft video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)
            ->getJson("/api/videos/{$video->vuid}/comments")
            ->assertForbidden();
    });

    test('non-owner is forbidden from chatting about a draft video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'What is this about?'])
            ->assertForbidden();
    });

    test('guest is unauthorized (not forbidden) from chatting about a draft video', function () {
        $video = Video::factory()->draft()->create();

        // Chat lives behind auth:sanctum, so an unauthenticated guest gets 401
        // before the view policy ever runs.
        $this->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'Hi'])
            ->assertUnauthorized();
    });

    test('owner can view summary of their own draft video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($owner)
            ->getJson("/api/videos/{$video->vuid}/summary")
            ->assertOk();
    });

    test('owner can view related of their own draft video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($owner)
            ->getJson("/api/videos/{$video->vuid}/related")
            ->assertOk();
    });

    test('owner can list comments of their own draft video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($owner)
            ->getJson("/api/videos/{$video->vuid}/comments")
            ->assertOk();
    });

    test('owner passes authorization for chat on their own draft video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->draft()->for($owner, 'channel')->create();

        // Authorization succeeds (not 403); the request reaches the controller and
        // returns 422 because the draft has no ready transcription for the chat.
        $this->actingAs($owner)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'What is this about?'])
            ->assertStatus(422);
    });

    test('summary of a published video stays accessible to guests', function () {
        $video = Video::factory()->published()->create();

        $this->getJson("/api/videos/{$video->vuid}/summary")->assertOk();
    });

    test('comments of a published video stay accessible to guests', function () {
        $video = Video::factory()->published()->create();

        $this->getJson("/api/videos/{$video->vuid}/comments")->assertOk();
    });

    test('related of a published video stays accessible to guests', function () {
        $video = Video::factory()->published()->create();

        $this->getJson("/api/videos/{$video->vuid}/related")->assertOk();
    });
});

describe('video-chat rate limiter', function () {
    test('blocks the 21st chat request within a minute with 429', function () {
        $user = User::factory()->create();
        $video = Video::factory()->published()->for($user, 'channel')->create();

        // No ready transcription -> the controller returns 422, but the throttle
        // still counts each hit. The 21st request must be rejected with 429.
        foreach (range(1, 20) as $i) {
            $this->actingAs($user)
                ->postJson("/api/videos/{$video->vuid}/chat", ['question' => "q{$i}"])
                ->assertStatus(422);
        }

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'one too many'])
            ->assertStatus(429);
    });
});

describe('VideoController reaction authorization', function () {
    test('non-owner cannot react to or track progress on another users draft', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $draft = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($other)->postJson("/api/videos/{$draft->vuid}/views")->assertForbidden();
        $this->actingAs($other)->postJson("/api/videos/{$draft->vuid}/like")->assertForbidden();
        $this->actingAs($other)->postJson("/api/videos/{$draft->vuid}/dislike")->assertForbidden();
        $this->actingAs($other)->postJson("/api/videos/{$draft->vuid}/save")->assertForbidden();
        $this->actingAs($other)
            ->putJson("/api/videos/{$draft->vuid}/progress", ['percent' => 50])
            ->assertForbidden();

        $this->assertDatabaseMissing('user_video_reactions', ['video_id' => $draft->id]);
        $this->assertDatabaseMissing('video_progress', ['video_id' => $draft->id]);
    });

    test('owner can react to and track progress on their own draft', function () {
        $owner = User::factory()->create();
        $draft = Video::factory()->draft()->for($owner, 'channel')->create();

        $this->actingAs($owner)->postJson("/api/videos/{$draft->vuid}/like")->assertNoContent();
        $this->actingAs($owner)
            ->putJson("/api/videos/{$draft->vuid}/progress", ['percent' => 50])
            ->assertNoContent();
    });

    test('any authenticated user can react to a published video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->published()->for($owner, 'channel')->create();

        $this->actingAs($other)->postJson("/api/videos/{$video->vuid}/like")->assertNoContent();
    });
});
