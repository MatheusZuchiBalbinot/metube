<?php

declare(strict_types=1);

use App\Enums\HistoryPeriod;
use App\Enums\ReactionType;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoProgress;
use App\Models\WatchHistory;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

describe('UserService', function () {
    $service = app(UserService::class);

    beforeEach(function () use (&$service) {
        Cache::flush();
        $service = app(UserService::class);
    });

    test('getUserLikes returns paginated liked videos', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        DB::table('user_video_reactions')->insert([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'type' => ReactionType::LIKE->value,
        ]);

        $result = $service->getUserLikes($user);

        expect($result->total())->toBe(1)
            ->and($result->items()[0]->id)->toBe($video->id);
    });

    test('getUserLikes returns empty paginator when no likes', function () use (&$service) {
        $user = User::factory()->create();

        $result = $service->getUserLikes($user);

        expect($result->total())->toBe(0);
    });

    test('getUserSaved returns videos in Watch Later playlist', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $watchLater = $user->getWatchLaterPlaylist();
        $watchLater->videos()->attach($video->id, ['position' => 0]);

        $result = $service->getUserSaved($user);

        expect($result->total())->toBe(1)
            ->and($result->items()[0]->id)->toBe($video->id);
    });

    test('getUserSubscriptions returns channels user is subscribed to', function () use (&$service) {
        config(['cache.vidsum.user.subscriptions.active' => false]);

        $user = User::factory()->create();
        $channel = User::factory()->create();
        $user->subscriptions()->attach($channel->id);

        $result = $service->getUserSubscriptions($user);

        expect($result->count())->toBe(1)
            ->and($result->first()->id)->toBe($channel->id);
    });

    test('getUserSubscriptions returns empty collection when no subscriptions', function () use (&$service) {
        config(['cache.vidsum.user.subscriptions.active' => false]);

        $user = User::factory()->create();

        $result = $service->getUserSubscriptions($user);

        expect($result->count())->toBe(0);
    });

    test('getUserHistory returns paginated watch history', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => now(),
        ]);

        $result = $service->getUserHistory($user, HistoryPeriod::ALL);

        expect($result->total())->toBe(1);
    });

    test('getUserHistory filters by today period', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $oldVideo = Video::factory()->for($user, 'channel')->create();

        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => now(),
        ]);
        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $oldVideo->id,
            'watched_at' => now()->subMonth(),
        ]);

        $result = $service->getUserHistory($user, HistoryPeriod::TODAY);

        expect($result->total())->toBe(1);
    });

    test('clearUserHistory deletes all history for user', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => now(),
        ]);

        $service->clearUserHistory($user);

        $this->assertDatabaseMissing('watch_histories', ['user_id' => $user->id]);
    });

    test('removeFromHistory removes only the specified video', function () use (&$service) {
        $user = User::factory()->create();
        $video1 = Video::factory()->for($user, 'channel')->create();
        $video2 = Video::factory()->for($user, 'channel')->create();

        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video1->id,
            'watched_at' => now(),
        ]);
        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video2->id,
            'watched_at' => now(),
        ]);

        $service->removeFromHistory($user, $video1->vuid);

        $this->assertDatabaseMissing('watch_histories', ['user_id' => $user->id, 'video_id' => $video1->id]);
        $this->assertDatabaseHas('watch_histories', ['user_id' => $user->id, 'video_id' => $video2->id]);
    });

    test('getUserProgress returns map of vuid to percent', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        VideoProgress::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'percent' => 42,
        ]);

        $result = $service->getUserProgress($user);

        expect($result)->toHaveKey($video->vuid)
            ->and($result[$video->vuid])->toBe(42);
    });

    test('getHistoryEvents returns aggregated watch activity', function () use (&$service) {
        config(['cache.vidsum.user.history_events.active' => false]);

        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        WatchHistory::factory()->create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => now(),
        ]);

        $result = $service->getHistoryEvents($user);

        expect($result)->not->toBeEmpty();
        $isCorrectShape = isset($result[0]['date']) && isset($result[0]['count']);
        expect($isCorrectShape)->toBeTrue();
    });
});
