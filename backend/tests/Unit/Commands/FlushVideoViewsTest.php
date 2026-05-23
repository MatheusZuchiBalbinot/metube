<?php

use App\Services\ViewCounterService;
use Illuminate\Support\Facades\Artisan;

describe('FlushVideoViews', function () {
    test('command calls flush on ViewCounterService and returns success', function () {
        $mock = Mockery::mock(ViewCounterService::class);
        $mock->shouldReceive('flush')->once()->andReturn(3);
        app()->instance(ViewCounterService::class, $mock);

        $exitCode = Artisan::call('views:flush');

        expect($exitCode)->toBe(0);
    });

    test('command outputs flushed video count', function () {
        $mock = Mockery::mock(ViewCounterService::class);
        $mock->shouldReceive('flush')->once()->andReturn(5);
        app()->instance(ViewCounterService::class, $mock);

        Artisan::call('views:flush');
        $output = Artisan::output();

        expect($output)->toContain('Flushed views for 5 videos');
    });

    test('command returns SUCCESS when no videos are dirty', function () {
        $mock = Mockery::mock(ViewCounterService::class);
        $mock->shouldReceive('flush')->once()->andReturn(0);
        app()->instance(ViewCounterService::class, $mock);

        $exitCode = Artisan::call('views:flush');

        expect($exitCode)->toBe(0);
    });

    test('command signature is views:flush', function () {
        expect(collect(Artisan::all())->has('views:flush'))->toBeTrue();
    });
});
