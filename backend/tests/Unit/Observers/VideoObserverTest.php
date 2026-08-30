<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use App\Observers\VideoObserver;
use App\Services\CacheService;
use Illuminate\Support\Facades\DB;

describe('VideoObserver', function () {
    test('updated always flushes video cache', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['title' => 'Old']);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);
        $cache->shouldNotReceive('forgetFeed');

        $observer = new VideoObserver($cache);
        $video->title = 'New';
        $video->save();

        $observer->updated($video);
    });

    test('updated flushes the owning channel cache', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['title' => 'Old']);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);
        $cache->shouldNotReceive('forgetFeed');

        $observer = new VideoObserver($cache);
        $video->title = 'New';
        $video->save();

        $observer->updated($video);
    });

    test('updated also flushes feed cache when status changes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['status' => 'draft']);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $video->status = VideoStatus::PUBLISHED;
        $video->save();

        $observer->updated($video);
    });

    test('updated also flushes feed cache when published_at changes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['published_at' => null]);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $video->published_at = now();
        $video->save();

        $observer->updated($video);
    });

    test('deleted flushes video, channel, and feed caches', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $observer->deleted($video);
    });

    test('deleted resolves the channel uuid without an extra query when already loaded', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $video->load('channel');

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);

        DB::enableQueryLog();
        $observer->deleted($video);
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($queries)->toBeEmpty();
    });

    test('deleted skips channel flush when the owning channel is gone', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $user->delete();
        $video->setRelation('channel', null);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldNotReceive('forgetChannel');
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $observer->deleted($video);
    });
});
