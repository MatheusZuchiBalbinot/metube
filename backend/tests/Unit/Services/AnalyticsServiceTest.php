<?php

use App\Events\SearchPerformed;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoImpressed;
use App\Events\VideoSkipped;
use App\Models\User;
use App\Models\Video;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

describe('AnalyticsService', function () {
    test('recordImpressions dispatches one event per known vuid in render order', function () {
        Event::fake([
            VideoImpressed::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $videos = Video::factory(3)->create();
        $vuids = $videos->pluck('vuid')->all();

        (new AnalyticsService)->recordImpressions($user, $vuids, 'feed', 'sess-1');

        Event::assertDispatchedTimes(VideoImpressed::class, 3);

        foreach ($vuids as $position => $vuid) {
            Event::assertDispatched(
                VideoImpressed::class,
                fn (VideoImpressed $event): bool => $event->video->vuid === $vuid
                    && $event->position === $position
                    && $event->source === 'feed'
                    && $event->sessionId === 'sess-1',
            );
        }
    });

    test('recordImpressions silently ignores unknown vuids', function () {
        Event::fake([
            VideoImpressed::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new AnalyticsService)->recordImpressions($user, [$video->vuid, 'unknownvuid'], 'home');

        Event::assertDispatchedTimes(VideoImpressed::class, 1);
    });

    test('recordClick dispatches VideoClickedFromFeed', function () {
        Event::fake([
            VideoImpressed::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new AnalyticsService)->recordClick($user, $video, 'recommended', 2, 'sess-9');

        Event::assertDispatched(
            VideoClickedFromFeed::class,
            fn (VideoClickedFromFeed $event): bool => $event->video->id === $video->id
                && $event->source === 'recommended'
                && $event->position === 2
                && $event->sessionId === 'sess-9',
        );
    });

    test('recordSearch dispatches SearchPerformed', function () {
        Event::fake([
            VideoImpressed::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();

        (new AnalyticsService)->recordSearch($user, 'laravel queues', 7);

        Event::assertDispatched(
            SearchPerformed::class,
            fn (SearchPerformed $event): bool => $event->query === 'laravel queues'
                && $event->resultCount === 7,
        );
    });

    test('recordSkip dispatches VideoSkipped with percent', function () {
        Event::fake([
            VideoImpressed::class,
            VideoClickedFromFeed::class,
            SearchPerformed::class,
            VideoSkipped::class,
        ]);

        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new AnalyticsService)->recordSkip($user, $video, 8);

        Event::assertDispatched(
            VideoSkipped::class,
            fn (VideoSkipped $event): bool => $event->video->id === $video->id && $event->percent === 8,
        );
    });
});
