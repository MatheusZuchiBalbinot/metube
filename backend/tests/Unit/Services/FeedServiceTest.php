<?php

declare(strict_types=1);

use App\Enums\FeedSectionKey;
use App\Models\User;
use App\Models\Video;
use App\Models\WatchHistory;
use App\Services\FeedService;

/**
 * @param array<int, App\DTOs\FeedSection> $sections
 *
 * @return array<int, FeedSectionKey>
 */
function feedKeys(array $sections): array
{
    return array_map(fn ($section) => $section->key, $sections);
}

describe('FeedService', function () {
    test('guest receives only generic sections', function () {
        $creator = User::factory()->create();
        Video::factory()->count(3)->for($creator, 'channel')->published()->create();

        $sections = app(FeedService::class)->forUser(null);
        $keys = feedKeys($sections);

        expect($keys)->toContain(FeedSectionKey::TRENDING)
            ->and($keys)->toContain(FeedSectionKey::RECENT)
            ->and($keys)->not->toContain(FeedSectionKey::SUBSCRIPTIONS)
            ->and($keys)->not->toContain(FeedSectionKey::BECAUSE_YOU_WATCHED);
    });

    test('omits every section when there are no videos', function () {
        $sections = app(FeedService::class)->forUser(null);

        expect($sections)->toBe([]);
    });

    test('includes the subscriptions section for a subscribed user', function () {
        $creator = User::factory()->create();
        Video::factory()->count(2)->for($creator, 'channel')->published()->create();

        $user = User::factory()->create();
        $user->subscriptions()->attach($creator->id);

        $sections = app(FeedService::class)->forUser($user);
        $subscriptions = collect($sections)->firstWhere('key', FeedSectionKey::SUBSCRIPTIONS);

        expect($subscriptions)->not->toBeNull()
            ->and($subscriptions->videos)->toHaveCount(2);
    });

    test('adds a because-you-watched shelf from the dominant watched tag', function () {
        $creator = User::factory()->create();
        Video::factory()->count(4)->for($creator, 'channel')->published()->create(['tags' => ['php']]);
        $watched = Video::factory()->count(2)->for($creator, 'channel')->published()->create(['tags' => ['php']]);

        $user = User::factory()->create();

        foreach ($watched as $video) {
            WatchHistory::create(['user_id' => $user->id, 'video_id' => $video->id, 'watched_at' => now()]);
        }

        $sections = app(FeedService::class)->forUser($user);
        $shelf = collect($sections)->firstWhere('key', FeedSectionKey::BECAUSE_YOU_WATCHED);

        expect($shelf)->not->toBeNull()
            ->and($shelf->label)->toBe('php');
    });

    test('respects the per-shelf size limit', function () {
        $creator = User::factory()->create();
        Video::factory()->count(20)->for($creator, 'channel')->published()->create();

        $sections = app(FeedService::class)->forUser(null);
        $recent = collect($sections)->firstWhere('key', FeedSectionKey::RECENT);

        expect($recent->videos->count())->toBeLessThanOrEqual(12);
    });

    test('trending excludes videos published outside the recent window', function () {
        $creator = User::factory()->create();
        $stale = Video::factory()->for($creator, 'channel')->published()->create([
            'views' => 10_000,
            'published_at' => now()->subDays(200),
        ]);
        $fresh = Video::factory()->for($creator, 'channel')->published()->create([
            'views' => 50,
            'published_at' => now()->subDays(2),
        ]);

        $sections = app(FeedService::class)->forUser(null);
        $trending = collect($sections)->firstWhere('key', FeedSectionKey::TRENDING);
        $ids = $trending->videos->pluck('id')->toArray();

        expect($ids)->toContain($fresh->id)
            ->and($ids)->not->toContain($stale->id);
    });

    test('trending applies time decay so a fresher video can outrank an older popular one', function () {
        $creator = User::factory()->create();
        $olderPopular = Video::factory()->for($creator, 'channel')->published()->create([
            'views' => 1_000,
            'published_at' => now()->subDays(60),
        ]);
        $fresh = Video::factory()->for($creator, 'channel')->published()->create([
            'views' => 800,
            'published_at' => now()->subDay(),
        ]);

        $sections = app(FeedService::class)->forUser(null);
        $trending = collect($sections)->firstWhere('key', FeedSectionKey::TRENDING);
        $ids = $trending->videos->pluck('id')->toArray();

        // With a 14-day half-life, the 60-day-old video's views decay far below
        // the 1-day-old one, so the fresher video ranks higher.
        expect(array_search($fresh->id, $ids, true))
            ->toBeLessThan(array_search($olderPopular->id, $ids, true));
    });
});
