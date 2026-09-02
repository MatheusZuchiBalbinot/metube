<?php

declare(strict_types=1);

use App\Config\UploadLimits;
use App\Services\Tus\TusQuotaService;
use Illuminate\Contracts\Redis\Connection as RedisConnectionContract;
use Illuminate\Contracts\Redis\Factory as RedisFactory;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * @return array{0: TusQuotaService, 1: Mockery\MockInterface}
 */
function makeTusQuotaService(): array
{
    $connection = Mockery::mock(RedisConnectionContract::class);
    $factory = Mockery::mock(RedisFactory::class);
    $factory->shouldReceive('connection')->andReturn($connection);

    return [new TusQuotaService($factory), $connection];
}

describe('TusQuotaService::reserve', function () {
    test('allows a reservation under quota and increments with a TTL', function () {
        [$service, $connection] = makeTusQuotaService();

        $connection->shouldReceive('command')->once()->with('get', ['tus:quota:7'])->andReturn('0');
        $connection->shouldReceive('command')->once()->with('incrby', ['tus:quota:7', 1024]);
        $connection->shouldReceive('command')->once()->with('expire', Mockery::on(fn ($args) => $args[0] === 'tus:quota:7'));

        $service->reserve(7, 1024);
    })->throwsNoExceptions();

    test('rejects a reservation that would exceed the quota', function () {
        [$service, $connection] = makeTusQuotaService();

        $almostFull = UploadLimits::TUS_USER_QUOTA_BYTES - 100;
        $connection->shouldReceive('command')->once()->with('get', ['tus:quota:7'])->andReturn((string) $almostFull);
        $connection->shouldNotReceive('command')->with('incrby', Mockery::any());

        expect(fn () => $service->reserve(7, 200))
            ->toThrow(HttpException::class);
    });

    test('fails open (does not throw) when Redis is unreachable', function () {
        [$service, $connection] = makeTusQuotaService();

        $connection->shouldReceive('command')->once()->with('get', ['tus:quota:7'])->andThrow(new RedisException('connection refused'));

        $service->reserve(7, 1024);
    })->throwsNoExceptions();
});

describe('TusQuotaService::release', function () {
    test('decrements the reservation', function () {
        [$service, $connection] = makeTusQuotaService();

        $connection->shouldReceive('command')->once()->with('decrby', ['tus:quota:7', 1024])->andReturn('4096');
        $connection->shouldNotReceive('command')->with('del', Mockery::any());

        $service->release(7, 1024);
    })->throwsNoExceptions();

    test('deletes the key once the reservation is fully drained', function () {
        [$service, $connection] = makeTusQuotaService();

        $connection->shouldReceive('command')->once()->with('decrby', ['tus:quota:7', 1024])->andReturn('0');
        $connection->shouldReceive('command')->once()->with('del', ['tus:quota:7']);

        $service->release(7, 1024);
    });

    test('deletes the key when a race drives the counter negative', function () {
        [$service, $connection] = makeTusQuotaService();

        $connection->shouldReceive('command')->once()->with('decrby', ['tus:quota:7', 2048])->andReturn('-100');
        $connection->shouldReceive('command')->once()->with('del', ['tus:quota:7']);

        $service->release(7, 2048);
    });

    test('fails soft (does not throw) when Redis is unreachable', function () {
        [$service, $connection] = makeTusQuotaService();

        $connection->shouldReceive('command')->once()->with('decrby', ['tus:quota:7', 1024])->andThrow(new RedisException('connection refused'));

        $service->release(7, 1024);
    })->throwsNoExceptions();
});
