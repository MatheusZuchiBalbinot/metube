<?php

use App\Models\Playlist;
use App\Observers\PlaylistObserver;
use App\Services\CacheService;

describe('PlaylistObserver', function () {
    test('created flushes user playlist cache', function () {
        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetUserPlaylists')->once()->with(42);

        $observer = new PlaylistObserver($cache);
        $playlist = new Playlist(['user_id' => 42]);

        $observer->created($playlist);
    });

    test('updated flushes user playlist cache', function () {
        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetUserPlaylists')->once()->with(7);

        $observer = new PlaylistObserver($cache);
        $playlist = new Playlist(['user_id' => 7]);

        $observer->updated($playlist);
    });

    test('deleted flushes user playlist cache', function () {
        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetUserPlaylists')->once()->with(99);

        $observer = new PlaylistObserver($cache);
        $playlist = new Playlist(['user_id' => 99]);

        $observer->deleted($playlist);
    });
});
