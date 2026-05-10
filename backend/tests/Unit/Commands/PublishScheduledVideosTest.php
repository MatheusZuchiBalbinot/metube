<?php

use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('videos:publish-scheduled', function () {
    test('publishes videos whose scheduled_at has passed', function () {
        $due = Video::factory()->scheduled()->create([
            'scheduled_at' => now()->subMinute(),
        ]);

        $this->artisan('videos:publish-scheduled')->assertSuccessful();

        expect($due->fresh()?->status)->toBe(VideoStatus::PUBLISHED);
    });

    test('sets published_at to the original scheduled_at value', function () {
        $scheduledAt = now()->subHour()->startOfMinute();
        $due = Video::factory()->scheduled()->create([
            'scheduled_at' => $scheduledAt,
        ]);

        $this->artisan('videos:publish-scheduled')->assertSuccessful();

        expect($due->fresh()?->published_at?->toDateTimeString())
            ->toBe($scheduledAt->toDateTimeString());
    });

    test('does not publish videos scheduled in the future', function () {
        $future = Video::factory()->scheduled()->create([
            'scheduled_at' => now()->addHour(),
        ]);

        $this->artisan('videos:publish-scheduled')->assertSuccessful();

        expect($future->fresh()?->status)->toBe(VideoStatus::SCHEDULED);
    });

    test('does not affect already published videos', function () {
        $published = Video::factory()->published()->create();

        $this->artisan('videos:publish-scheduled')->assertSuccessful();

        expect($published->fresh()?->status)->toBe(VideoStatus::PUBLISHED);
    });

    test('publishes multiple due videos in one run', function () {
        Video::factory()->scheduled()->count(3)->create([
            'scheduled_at' => now()->subMinute(),
        ]);

        $this->artisan('videos:publish-scheduled')->assertSuccessful();

        $count = Video::where('status', VideoStatus::PUBLISHED)->count();
        expect($count)->toBe(3);
    });

    test('outputs the count of published videos', function () {
        Video::factory()->scheduled()->count(2)->create([
            'scheduled_at' => now()->subMinute(),
        ]);

        $this->artisan('videos:publish-scheduled')
            ->expectsOutputToContain('2')
            ->assertSuccessful();
    });
});
