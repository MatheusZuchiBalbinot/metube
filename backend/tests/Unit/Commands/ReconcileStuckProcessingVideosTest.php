<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Models\Video;

describe('videos:reconcile-stuck-processing', function () {
    test('marks a video stuck in PROCESSING past the default threshold as FAILED', function () {
        $stuck = Video::factory()->create(['status' => VideoStatus::PROCESSING]);
        $stuck->created_at = now()->subHours(5);
        $stuck->save();

        $this->artisan('videos:reconcile-stuck-processing')->assertSuccessful();

        expect($stuck->fresh()?->status)->toBe(VideoStatus::FAILED);
    });

    test('does not affect a video within the default threshold', function () {
        $recent = Video::factory()->create(['status' => VideoStatus::PROCESSING]);
        $recent->created_at = now()->subMinutes(10);
        $recent->save();

        $this->artisan('videos:reconcile-stuck-processing')->assertSuccessful();

        expect($recent->fresh()?->status)->toBe(VideoStatus::PROCESSING);
    });

    test('accepts a custom --minutes threshold', function () {
        $video = Video::factory()->create(['status' => VideoStatus::PROCESSING]);
        $video->created_at = now()->subMinutes(90);
        $video->save();

        $this->artisan('videos:reconcile-stuck-processing', ['--minutes' => 60])->assertSuccessful();

        expect($video->fresh()?->status)->toBe(VideoStatus::FAILED);
    });

    test('outputs the count of reconciled videos', function () {
        $video = Video::factory()->create(['status' => VideoStatus::PROCESSING]);
        $video->created_at = now()->subHours(5);
        $video->save();

        $this->artisan('videos:reconcile-stuck-processing')
            ->expectsOutputToContain('1')
            ->assertSuccessful();
    });
});
