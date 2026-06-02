<?php

declare(strict_types=1);

use App\Enums\ReactionType;
use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Video;
use App\Models\VideoProgress;
use App\Models\WatchHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

describe('UserController', function () {
    test('likes returns videos liked by the authenticated user', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);
        DB::table('user_video_reactions')->insert([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'type' => ReactionType::LIKE->value,
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/likes');

        $response->assertOk();
        $response->assertJsonFragment(['vuid' => $video->vuid]);
    });

    test('likes returns empty when user has no likes', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/likes');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    });

    test('saved returns videos in the Watch Later playlist', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);
        $watchLater = $user->getWatchLaterPlaylist();
        $watchLater->videos()->attach($video->id, ['position' => 1]);

        $response = $this->actingAs($user)->getJson('/api/users/me/saved');

        $response->assertOk();
        $response->assertJsonFragment(['vuid' => $video->vuid]);
    });

    test('saved returns empty when Watch Later playlist is empty', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/saved');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    });

    test('subscriptions returns channels subscribed by authenticated user', function () {
        $user = User::factory()->create();
        $channel = User::factory()->create();
        UserSubscription::create(['user_id' => $user->id, 'channel_id' => $channel->id]);

        $response = $this->actingAs($user)->getJson('/api/users/me/subscriptions');

        $response->assertOk();
        $response->assertJsonFragment(['uuid' => $channel->uuid]);
    });

    test('subscriptions returns empty when user has no subscriptions', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/subscriptions');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    });

    test('history returns watch history for authenticated user', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $now = Carbon::now();

        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/history');

        $response->assertOk();
        $response->assertJsonFragment(['vuid' => $video->vuid]);
    });

    test('history returns empty when user has no history', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/history');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    });

    test('history accepts period query parameter', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/history?period=today');

        $response->assertOk();
    });

    test('history rejects an invalid period with a validation error', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/history?period=invalid');

        $response->assertStatus(422)
            ->assertJsonValidationErrorFor('period');
    });

    test('clearHistory removes all history for the user and returns 204', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $now = Carbon::now();

        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);

        $response = $this->actingAs($user)->deleteJson('/api/users/me/history');

        $response->assertNoContent();
        $this->assertDatabaseMissing('watch_histories', ['user_id' => $user->id]);
    });

    test('removeHistory removes a specific video from history and returns 204', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $other = Video::factory()->create();
        $now = Carbon::now();

        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);
        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $other->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);

        $response = $this->actingAs($user)->deleteJson("/api/users/me/history/{$video->vuid}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('watch_histories', ['user_id' => $user->id, 'video_id' => $video->id]);
        $this->assertDatabaseHas('watch_histories', ['user_id' => $user->id, 'video_id' => $other->id]);
    });

    test('historyEvents returns aggregated watch activity', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();
        $now = Carbon::now();

        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/history/events');

        $response->assertOk();
    });

    test('progress returns empty map when user has no progress', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/progress');

        $response->assertOk();
        $response->assertJson(['data' => []]);
    });

    test('progress returns vuid to percent map for all started videos', function () {
        $user = User::factory()->create();
        $videoA = Video::factory()->create();
        $videoB = Video::factory()->create();

        VideoProgress::factory()->create([
            'user_id' => $user->id,
            'video_id' => $videoA->id,
            'percent' => 45,
        ]);
        VideoProgress::factory()->create([
            'user_id' => $user->id,
            'video_id' => $videoB->id,
            'percent' => 100,
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/progress');

        $response->assertOk();
        $response->assertJson([
            'data' => [
                $videoA->vuid => 45,
                $videoB->vuid => 100,
            ],
        ]);
    });

    test('progress does not return progress from other users', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->create();

        VideoProgress::factory()->create([
            'user_id' => $other->id,
            'video_id' => $video->id,
            'percent' => 70,
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/progress');

        $response->assertOk();
        $response->assertJson(['data' => []]);
    });

    test('likes returns 401 for unauthenticated request', function () {
        $response = $this->getJson('/api/users/me/likes');
        $response->assertUnauthorized();
    });

    test('saved returns 401 for unauthenticated request', function () {
        $response = $this->getJson('/api/users/me/saved');
        $response->assertUnauthorized();
    });

    test('subscriptions returns 401 for unauthenticated request', function () {
        $response = $this->getJson('/api/users/me/subscriptions');
        $response->assertUnauthorized();
    });

    test('progress returns 401 for unauthenticated request', function () {
        $response = $this->getJson('/api/users/me/progress');
        $response->assertUnauthorized();
    });

    test('history returns 401 for unauthenticated request', function () {
        $response = $this->getJson('/api/users/me/history');
        $response->assertUnauthorized();
    });

    test('clearHistory returns 401 for unauthenticated request', function () {
        $response = $this->deleteJson('/api/users/me/history');
        $response->assertUnauthorized();
    });
});
