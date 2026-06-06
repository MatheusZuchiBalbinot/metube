<?php

declare(strict_types=1);

use App\Enums\FeedSectionKey;
use App\Models\User;
use App\Models\Video;
use App\Models\WatchHistory;
use App\Services\FeedService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

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
});
