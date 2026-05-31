<?php

declare(strict_types=1);

use App\Enums\VideoSource;
use App\Events\SearchPerformed;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoImpressionsBatch;
use App\Events\VideoSkipped;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('AnalyticsController', function () {
    test('POST /analytics/impressions dispatches one batch event for all vuids', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);
        $user = User::factory()->create();
        $videos = Video::factory(2)->create();

        $response = $this->actingAs($user)->postJson('/api/analytics/impressions', [
            'vuids' => $videos->pluck('vuid')->all(),
            'source' => 'feed',
            'session_id' => 'sess-1',
        ]);

        $response->assertNoContent();
        Event::assertDispatchedTimes(VideoImpressionsBatch::class, 1);
        Event::assertDispatched(
            VideoImpressionsBatch::class,
            fn (VideoImpressionsBatch $event): bool => count($event->items) === 2
                && $event->source === VideoSource::FEED
                && $event->sessionId === 'sess-1',
        );
    });

    test('POST /analytics/impressions rejects invalid source', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/analytics/impressions', [
            'vuids' => [$video->vuid],
            'source' => 'banana',
        ]);

        $response->assertUnprocessable();
    });

    test('POST /analytics/clicks dispatches VideoClickedFromFeed', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/analytics/clicks', [
            'vuid' => $video->vuid,
            'source' => 'recommended',
            'position' => 3,
        ]);

        $response->assertNoContent();
        Event::assertDispatched(VideoClickedFromFeed::class);
    });

    test('POST /analytics/searches dispatches SearchPerformed', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/analytics/searches', [
            'query' => 'docker compose',
            'result_count' => 5,
        ]);

        $response->assertNoContent();
        Event::assertDispatched(
            SearchPerformed::class,
            fn (SearchPerformed $event): bool => $event->query === 'docker compose',
        );
    });

    test('POST /analytics/skips dispatches VideoSkipped', function () {
        Event::fake([
            VideoImpressionsBatch::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);
        $user = User::factory()->create();
        $video = Video::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/analytics/skips', [
            'vuid' => $video->vuid,
            'percent' => 6,
        ]);

        $response->assertNoContent();
        Event::assertDispatched(
            VideoSkipped::class,
            fn (VideoSkipped $event): bool => $event->percent === 6,
        );
    });

    test('analytics endpoints require authentication', function () {
        $this->postJson('/api/analytics/impressions', [])->assertUnauthorized();
        $this->postJson('/api/analytics/clicks', [])->assertUnauthorized();
        $this->postJson('/api/analytics/searches', [])->assertUnauthorized();
        $this->postJson('/api/analytics/skips', [])->assertUnauthorized();
    });
});
