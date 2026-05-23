<?php

use App\Enums\VideoEventType;
use App\Models\User;
use App\Models\UserAnalytic;
use App\Models\Video;
use App\Services\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('RecommendationService', function () {
    test('returns popular videos for user with no event history', function () {
        $creator = User::factory()->create();
        $videos = Video::factory()->count(5)->for($creator, 'channel')->create(['status' => 'published']);
        $videos[0]->update(['views' => 100]);
        $videos[1]->update(['views' => 80]);
        $videos[2]->update(['views' => 60]);
        $videos[3]->update(['views' => 40]);
        $videos[4]->update(['views' => 20]);

        $user = User::factory()->create();
        $service = app(RecommendationService::class);

        $recommendations = $service->forUser($user, 1);

        expect($recommendations)->toHaveLength(5)
            ->and($recommendations->pluck('id')->toArray())->toBe($videos->pluck('id')->toArray());
    });

    test('handles empty results gracefully', function () {
        $user = User::factory()->create();
        $service = app(RecommendationService::class);

        $recommendations = $service->forUser($user, 1);

        expect($recommendations)->toHaveLength(0);
    });

    test('boosts videos with tags user has liked', function () {
        $creator = User::factory()->create();
        $likedVideo = Video::factory()->for($creator, 'channel')->create([
            'status' => 'published',
            'tags' => ['javascript'],
            'views' => 20,
            'published_at' => now()->subDays(1),
        ]);
        Video::factory()->for($creator, 'channel')->create([
            'status' => 'published',
            'tags' => ['python'],
            'views' => 1,
            'published_at' => now()->subDays(1),
        ]);

        $user = User::factory()->create();
        UserAnalytic::create([
            'user_id' => $user->id,
            'video_id' => $likedVideo->id,
            'channel_id' => $creator->id,
            'event_type' => VideoEventType::LIKE,
            'occurred_at' => now()->subDays(5),
        ]);

        $service = app(RecommendationService::class);
        $recommendations = $service->forUser($user, 1);

        expect($recommendations->first()->id)->toBe($likedVideo->id);
    });

    test('pagination works correctly', function () {
        $creator = User::factory()->create();
        Video::factory()->count(30)->for($creator, 'channel')->create(['status' => 'published']);

        $user = User::factory()->create();
        $service = app(RecommendationService::class);

        $page1 = $service->forUser($user, 1);
        $page2 = $service->forUser($user, 2);

        expect($page1)->toHaveLength(15)
            ->and($page2)->toHaveLength(15)
            ->and($page1->pluck('id')->toArray())->not->toBe($page2->pluck('id')->toArray());
    });

    test('respects cache configuration', function () {
        $creator = User::factory()->create();
        Video::factory()->count(5)->for($creator, 'channel')->create(['status' => 'published']);

        $user = User::factory()->create();
        $service = app(RecommendationService::class);

        config(['cache.vidsum.recommendations.active' => false]);

        $recommendations = $service->forUser($user, 1);

        expect($recommendations)->toHaveLength(5);
    });

    test('weighs different event types correctly', function () {
        $creator = User::factory()->create();
        $finishVideo = Video::factory()->for($creator, 'channel')->create([
            'status' => 'published',
            'tags' => ['finish-tag'],
            'views' => 10,
            'published_at' => now()->subDays(1),
        ]);
        $likeVideo = Video::factory()->for($creator, 'channel')->create([
            'status' => 'published',
            'tags' => ['like-tag'],
            'views' => 10,
            'published_at' => now()->subDays(1),
        ]);
        $saveVideo = Video::factory()->for($creator, 'channel')->create([
            'status' => 'published',
            'tags' => ['save-tag'],
            'views' => 10,
            'published_at' => now()->subDays(1),
        ]);

        $user = User::factory()->create();
        UserAnalytic::create([
            'user_id' => $user->id,
            'video_id' => $finishVideo->id,
            'channel_id' => $creator->id,
            'event_type' => VideoEventType::FINISH,
            'occurred_at' => now()->subDays(5),
        ]);
        UserAnalytic::create([
            'user_id' => $user->id,
            'video_id' => $likeVideo->id,
            'channel_id' => $creator->id,
            'event_type' => VideoEventType::LIKE,
            'occurred_at' => now()->subDays(5),
        ]);
        UserAnalytic::create([
            'user_id' => $user->id,
            'video_id' => $saveVideo->id,
            'channel_id' => $creator->id,
            'event_type' => VideoEventType::SAVE,
            'occurred_at' => now()->subDays(5),
        ]);

        $service = app(RecommendationService::class);
        $recommendations = $service->forUser($user, 1);

        $ids = $recommendations->pluck('id')->toArray();
        expect($ids[0])->toBe($finishVideo->id)  // FINISH = 1.0 weight
            ->and($ids[1])->toBe($likeVideo->id) // LIKE = 0.8 weight
            ->and($ids[2])->toBe($saveVideo->id); // SAVE = 0.7 weight
    });
});
