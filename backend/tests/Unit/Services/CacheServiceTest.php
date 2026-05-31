<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Video;
use App\Models\VideoSummary;
use App\Services\CacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

describe('CacheService', function () {
    $service = app(CacheService::class);

    beforeEach(function () use (&$service) {
        Cache::flush();
        $service = app(CacheService::class);
    });

    test('rememberFeed calls callback on cache miss and caches result', function () use (&$service) {
        config(['cache.vidsum.feed.active' => true, 'cache.vidsum.feed.ttl' => 60]);

        $callCount = 0;
        $paginator = new Illuminate\Pagination\LengthAwarePaginator([], 0, 20);

        $result = $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        expect($callCount)->toBe(1)
            ->and($result)->toBe($paginator);
    });

    test('rememberFeed returns cached result on second call without invoking callback again', function () use (&$service) {
        config(['cache.vidsum.feed.active' => true, 'cache.vidsum.feed.ttl' => 60]);

        $callCount = 0;
        $paginator = new Illuminate\Pagination\LengthAwarePaginator([], 0, 20);

        $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        expect($callCount)->toBe(1);
    });

    test('rememberFeed bypasses cache when feed.active is false', function () use (&$service) {
        config(['cache.vidsum.feed.active' => false]);

        $callCount = 0;
        $paginator = new Illuminate\Pagination\LengthAwarePaginator([], 0, 20);

        $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        expect($callCount)->toBe(2);
    });

    test('forgetFeed flushes the feed cache', function () use (&$service) {
        config(['cache.vidsum.feed.active' => true, 'cache.vidsum.feed.ttl' => 60]);

        $callCount = 0;
        $paginator = new Illuminate\Pagination\LengthAwarePaginator([], 0, 20);

        $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        $service->forgetFeed();

        $service->rememberFeed(1, function () use (&$callCount, $paginator) {
            $callCount++;

            return $paginator;
        });

        expect($callCount)->toBe(2);
    });

    test('rememberChannelInfo caches the channel user', function () use (&$service) {
        config(['cache.vidsum.channel.info.active' => true, 'cache.vidsum.channel.info.ttl' => 600]);

        $user = User::factory()->create();
        $callCount = 0;

        $service->rememberChannelInfo($user->uuid, function () use (&$callCount, $user) {
            $callCount++;

            return $user;
        });

        $service->rememberChannelInfo($user->uuid, function () use (&$callCount, $user) {
            $callCount++;

            return $user;
        });

        expect($callCount)->toBe(1);
    });

    test('rememberChannelInfo bypasses cache when channel.info.active is false', function () use (&$service) {
        config(['cache.vidsum.channel.info.active' => false]);

        $user = User::factory()->create();
        $callCount = 0;

        $service->rememberChannelInfo($user->uuid, function () use (&$callCount, $user) {
            $callCount++;

            return $user;
        });

        $service->rememberChannelInfo($user->uuid, function () use (&$callCount, $user) {
            $callCount++;

            return $user;
        });

        expect($callCount)->toBe(2);
    });

    test('forgetChannel flushes channel cache', function () use (&$service) {
        config(['cache.vidsum.channel.info.active' => true, 'cache.vidsum.channel.info.ttl' => 600]);

        $user = User::factory()->create();
        $callCount = 0;

        $service->rememberChannelInfo($user->uuid, function () use (&$callCount, $user) {
            $callCount++;

            return $user;
        });

        $service->forgetChannel($user->uuid);

        $service->rememberChannelInfo($user->uuid, function () use (&$callCount, $user) {
            $callCount++;

            return $user;
        });

        expect($callCount)->toBe(2);
    });

    test('rememberVideoMeta caches video metadata', function () use (&$service) {
        config(['cache.vidsum.video.meta.active' => true, 'cache.vidsum.video.meta.ttl' => 300]);

        $video = Video::factory()->create();
        $callCount = 0;

        $service->rememberVideoMeta($video->vuid, function () use (&$callCount, $video) {
            $callCount++;

            return $video;
        });

        $service->rememberVideoMeta($video->vuid, function () use (&$callCount, $video) {
            $callCount++;

            return $video;
        });

        expect($callCount)->toBe(1);
    });

    test('getOrCacheVideoSummary caches summary when present', function () use (&$service) {
        config(['cache.vidsum.video.summary.active' => true]);

        $video = Video::factory()->create();
        $summary = VideoSummary::factory()->for($video)->create();
        $callCount = 0;

        $service->getOrCacheVideoSummary($video->vuid, function () use (&$callCount, $summary) {
            $callCount++;

            return $summary;
        });

        $service->getOrCacheVideoSummary($video->vuid, function () use (&$callCount, $summary) {
            $callCount++;

            return $summary;
        });

        expect($callCount)->toBe(1);
    });

    test('getOrCacheVideoSummary does not cache null results', function () use (&$service) {
        config(['cache.vidsum.video.summary.active' => true]);

        $video = Video::factory()->create();
        $callCount = 0;

        $service->getOrCacheVideoSummary($video->vuid, function () use (&$callCount) {
            $callCount++;

            return null;
        });

        $service->getOrCacheVideoSummary($video->vuid, function () use (&$callCount) {
            $callCount++;

            return null;
        });

        expect($callCount)->toBe(2);
    });

    test('forgetVideo flushes video meta and summary cache', function () use (&$service) {
        config(['cache.vidsum.video.meta.active' => true, 'cache.vidsum.video.meta.ttl' => 300]);

        $video = Video::factory()->create();
        $callCount = 0;

        $service->rememberVideoMeta($video->vuid, function () use (&$callCount, $video) {
            $callCount++;

            return $video;
        });

        $service->forgetVideo($video->vuid);

        $service->rememberVideoMeta($video->vuid, function () use (&$callCount, $video) {
            $callCount++;

            return $video;
        });

        expect($callCount)->toBe(2);
    });

    test('rememberUserPlaylists caches playlists', function () use (&$service) {
        config(['cache.vidsum.user.playlists.active' => true, 'cache.vidsum.user.playlists.ttl' => 300]);

        $user = User::factory()->create();
        $callCount = 0;
        $playlists = collect();

        $service->rememberUserPlaylists($user->id, function () use (&$callCount, $playlists) {
            $callCount++;

            return $playlists;
        });

        $service->rememberUserPlaylists($user->id, function () use (&$callCount, $playlists) {
            $callCount++;

            return $playlists;
        });

        expect($callCount)->toBe(1);
    });

    test('forgetUserPlaylists invalidates playlist cache', function () use (&$service) {
        config(['cache.vidsum.user.playlists.active' => true, 'cache.vidsum.user.playlists.ttl' => 300]);

        $user = User::factory()->create();
        $callCount = 0;
        $playlists = collect();

        $service->rememberUserPlaylists($user->id, function () use (&$callCount, $playlists) {
            $callCount++;

            return $playlists;
        });

        $service->forgetUserPlaylists($user->id);

        $service->rememberUserPlaylists($user->id, function () use (&$callCount, $playlists) {
            $callCount++;

            return $playlists;
        });

        expect($callCount)->toBe(2);
    });

    test('rememberHistoryEvents caches history heatmap', function () use (&$service) {
        config(['cache.vidsum.user.history_events.active' => true, 'cache.vidsum.user.history_events.ttl' => 300]);

        $user = User::factory()->create();
        $callCount = 0;
        $events = [['date' => '2026-01-01', 'count' => 3]];

        $service->rememberHistoryEvents($user->id, function () use (&$callCount, $events) {
            $callCount++;

            return $events;
        });

        $service->rememberHistoryEvents($user->id, function () use (&$callCount, $events) {
            $callCount++;

            return $events;
        });

        expect($callCount)->toBe(1);
    });

    test('forgetHistoryEvents invalidates history events cache', function () use (&$service) {
        config(['cache.vidsum.user.history_events.active' => true, 'cache.vidsum.user.history_events.ttl' => 300]);

        $user = User::factory()->create();
        $callCount = 0;
        $events = [['date' => '2026-01-01', 'count' => 1]];

        $service->rememberHistoryEvents($user->id, function () use (&$callCount, $events) {
            $callCount++;

            return $events;
        });

        $service->forgetHistoryEvents($user->id);

        $service->rememberHistoryEvents($user->id, function () use (&$callCount, $events) {
            $callCount++;

            return $events;
        });

        expect($callCount)->toBe(2);
    });
});
