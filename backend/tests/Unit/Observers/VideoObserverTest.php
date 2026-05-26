<?php

use App\Models\User;
use App\Models\Video;
use App\Observers\VideoObserver;
use App\Services\CacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoObserver', function () {
    test('updated always flushes video cache', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['title' => 'Old']);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
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
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $video->status = \App\Enums\VideoStatus::PUBLISHED;
        $video->save();

        $observer->updated($video);
    });

    test('updated also flushes feed cache when published_at changes', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['published_at' => null]);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $video->published_at = now();
        $video->save();

        $observer->updated($video);
    });

    test('deleted flushes both video cache and feed cache', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetVideo')->once()->with($video->vuid);
        $cache->shouldReceive('forgetFeed')->once();

        $observer = new VideoObserver($cache);
        $observer->deleted($video);
    });
});
