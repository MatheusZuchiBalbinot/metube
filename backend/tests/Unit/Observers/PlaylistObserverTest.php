<?php

declare(strict_types=1);

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

    test('registers $afterCommit so the dispatcher defers this observer until the enclosing transaction commits', function () {
        // See VideoObserverTest's equivalent test for why this only asserts
        // the flag rather than a real transaction round-trip.
        $observer = new PlaylistObserver(Mockery::mock(CacheService::class));

        expect($observer->afterCommit)->toBeTrue();
    });
});
