<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Video;
use App\Services\ViewCounterService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('ViewCounterService', function () {
    $service = app(ViewCounterService::class);

    beforeEach(function () use (&$service) {
        $service = app(ViewCounterService::class);
    });

    test('increment writes view directly to database in test mode', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['views' => 5]);

        $service->increment($video->id);

        $video->refresh();
        expect($video->views)->toBe(6);
    });

    test('increment increases views by one each call', function () use (&$service) {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['views' => 0]);

        $service->increment($video->id);
        $service->increment($video->id);
        $service->increment($video->id);

        $video->refresh();
        expect($video->views)->toBe(3);
    });

    test('increment does not affect other videos', function () use (&$service) {
        $user = User::factory()->create();
        $video1 = Video::factory()->for($user, 'channel')->create(['views' => 10]);
        $video2 = Video::factory()->for($user, 'channel')->create(['views' => 20]);

        $service->increment($video1->id);

        $video2->refresh();
        expect($video2->views)->toBe(20);
    });
});
