<?php

declare(strict_types=1);

use App\Models\User;
use App\Observers\UserObserver;
use App\Services\CacheService;

describe('UserObserver', function () {
    test('updated flushes channel cache when name changes', function () {
        $user = User::factory()->create(['name' => 'Alice']);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);

        $observer = new UserObserver($cache);
        $user->name = 'Bob';
        $user->save();

        $observer->updated($user);
    });

    test('updated flushes channel cache when avatar changes', function () {
        $user = User::factory()->create(['avatar' => null]);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);

        $observer = new UserObserver($cache);
        $user->avatar = 'avatars/new.jpg';
        $user->save();

        $observer->updated($user);
    });

    test('updated flushes channel cache when bio changes', function () {
        $user = User::factory()->create(['bio' => null]);

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldReceive('forgetChannel')->once()->with($user->uuid);

        $observer = new UserObserver($cache);
        $user->bio = 'New bio';
        $user->save();

        $observer->updated($user);
    });

    test('updated does not flush channel cache when unrelated field changes', function () {
        $user = User::factory()->create();

        $cache = Mockery::mock(CacheService::class);
        $cache->shouldNotReceive('forgetChannel');

        $observer = new UserObserver($cache);
        $user->session_version = $user->session_version + 1;
        $user->save();

        $observer->updated($user);
    });

    test('registers $afterCommit so the dispatcher defers this observer until the enclosing transaction commits', function () {
        // See VideoObserverTest's equivalent test for why this only asserts
        // the flag rather than a real transaction round-trip.
        $observer = new UserObserver(Mockery::mock(CacheService::class));

        expect($observer->afterCommit)->toBeTrue();
    });
});
