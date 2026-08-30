<?php

declare(strict_types=1);

use App\Contracts\ViewCounterStore;
use App\Models\User;
use App\Models\Video;
use App\Services\DatabaseViewCounterStore;
use App\Services\RedisViewCounterStore;
use App\Services\ViewCounterService;
use Illuminate\Contracts\Redis\Connection as RedisConnection;
use Illuminate\Contracts\Redis\Factory as RedisFactory;

describe('ViewCounterService', function () {
    test('increment delegates to the store', function () {
        $store = Mockery::mock(ViewCounterStore::class);
        $store->shouldReceive('increment')->once()->with(42);
        $store->shouldReceive('pullDirtyCounts')->never();

        $service = new ViewCounterService($store);

        $service->increment(42);
    });

    test('flush applies pulled counts to the videos table', function () {
        $user = User::factory()->create();
        $video1 = Video::factory()->for($user, 'channel')->create(['views' => 5]);
        $video2 = Video::factory()->for($user, 'channel')->create(['views' => 20]);

        $store = Mockery::mock(ViewCounterStore::class);
        $store->shouldReceive('pullDirtyCounts')->once()->andReturn([
            $video1->id => 3,
            $video2->id => 7,
        ]);

        $service = new ViewCounterService($store);
        $updated = $service->flush();

        expect($updated)->toBe(2);
        expect($video1->fresh()->views)->toBe(8);
        expect($video2->fresh()->views)->toBe(27);
    });

    test('flush returns zero when nothing is pending', function () {
        $store = Mockery::mock(ViewCounterStore::class);
        $store->shouldReceive('pullDirtyCounts')->once()->andReturn([]);

        $service = new ViewCounterService($store);

        expect($service->flush())->toBe(0);
    });

    test('flush skips non-positive counts', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['views' => 9]);

        $store = Mockery::mock(ViewCounterStore::class);
        $store->shouldReceive('pullDirtyCounts')->once()->andReturn([$video->id => 0]);

        $service = new ViewCounterService($store);
        $updated = $service->flush();

        expect($updated)->toBe(0);
        expect($video->fresh()->views)->toBe(9);
    });
});

describe('DatabaseViewCounterStore', function () {
    test('increment writes a single view straight to the database', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['views' => 5]);

        $store = new DatabaseViewCounterStore();
        $store->increment($video->id);

        expect($video->fresh()->views)->toBe(6);
    });

    test('increment does not affect other videos', function () {
        $user = User::factory()->create();
        $video1 = Video::factory()->for($user, 'channel')->create(['views' => 10]);
        $video2 = Video::factory()->for($user, 'channel')->create(['views' => 20]);

        $store = new DatabaseViewCounterStore();
        $store->increment($video1->id);

        expect($video2->fresh()->views)->toBe(20);
    });

    test('pullDirtyCounts is always empty because there is no buffer', function () {
        $store = new DatabaseViewCounterStore();

        expect($store->pullDirtyCounts())->toBe([]);
    });
});

describe('RedisViewCounterStore', function () {
    test('increment INCRs the counter and flags the video as dirty', function () {
        $conn = Mockery::mock(RedisConnection::class);
        $conn->shouldReceive('command')->once()->with('INCR', ['metube:views:pending:7']);
        $conn->shouldReceive('command')->once()->with('SADD', ['metube:views:dirty', 7]);

        $factory = Mockery::mock(RedisFactory::class);
        $factory->shouldReceive('connection')->andReturn($conn);

        $store = new RedisViewCounterStore($factory);
        $store->increment(7);
    });

    test('pullDirtyCounts drains each dirty counter atomically', function () {
        $conn = Mockery::mock(RedisConnection::class);
        $conn->shouldReceive('command')->once()->with('SMEMBERS', ['metube:views:dirty'])->andReturn(['7', '9']);
        $conn->shouldReceive('command')->once()->with('GETDEL', ['metube:views:pending:7'])->andReturn('3');
        $conn->shouldReceive('command')->once()->with('SREM', ['metube:views:dirty', 7]);
        $conn->shouldReceive('command')->once()->with('GETDEL', ['metube:views:pending:9'])->andReturn('5');
        $conn->shouldReceive('command')->once()->with('SREM', ['metube:views:dirty', 9]);

        $factory = Mockery::mock(RedisFactory::class);
        $factory->shouldReceive('connection')->andReturn($conn);

        $store = new RedisViewCounterStore($factory);

        expect($store->pullDirtyCounts())->toBe([7 => 3, 9 => 5]);
    });

    test('pullDirtyCounts returns empty when nothing is dirty', function () {
        $conn = Mockery::mock(RedisConnection::class);
        $conn->shouldReceive('command')->once()->with('SMEMBERS', ['metube:views:dirty'])->andReturn([]);

        $factory = Mockery::mock(RedisFactory::class);
        $factory->shouldReceive('connection')->andReturn($conn);

        $store = new RedisViewCounterStore($factory);

        expect($store->pullDirtyCounts())->toBe([]);
    });

    test('pullDirtyCounts skips ids with no positive counter', function () {
        $conn = Mockery::mock(RedisConnection::class);
        $conn->shouldReceive('command')->once()->with('SMEMBERS', ['metube:views:dirty'])->andReturn(['7']);
        $conn->shouldReceive('command')->once()->with('GETDEL', ['metube:views:pending:7'])->andReturn(null);
        $conn->shouldReceive('command')->once()->with('SREM', ['metube:views:dirty', 7]);

        $factory = Mockery::mock(RedisFactory::class);
        $factory->shouldReceive('connection')->andReturn($conn);

        $store = new RedisViewCounterStore($factory);

        expect($store->pullDirtyCounts())->toBe([]);
    });
});
