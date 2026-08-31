<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Models\Comment;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\UserVideoReaction;
use App\Models\Video;
use App\Models\WatchHistory;
use Database\Seeders\DemoContentSeeder;

describe('DemoContentSeeder', function () {
    test('seeds themed channels and a rich published catalogue', function () {
        $this->seed(DemoContentSeeder::class);

        expect(User::where('email', 'like', '%@metube.com')->count())->toBeGreaterThanOrEqual(8)
            ->and(Video::where('status', VideoStatus::PUBLISHED->value)->count())->toBeGreaterThanOrEqual(50);
    });

    test('seeds playable external video links and thumbnails', function () {
        $this->seed(DemoContentSeeder::class);

        $video = Video::where('status', VideoStatus::PUBLISHED->value)->firstOrFail();

        expect($video->video_url)->toStartWith('https://')
            ->and($video->thumbnail_url)->toStartWith('https://');
    });

    test('seeds shorts, non-published states and engagement', function () {
        $this->seed(DemoContentSeeder::class);

        $shorts = Video::all()->filter(fn (Video $v) => in_array('shorts', $v->tags ?? [], true))->count();

        $nonPublishedStatuses = [
            VideoStatus::SCHEDULED->value,
            VideoStatus::DRAFT->value,
            VideoStatus::PROCESSING->value,
            VideoStatus::FAILED->value,
        ];

        expect($shorts)->toBeGreaterThanOrEqual(1)
            ->and(Video::where('status', VideoStatus::SCHEDULED->value)->count())->toBeGreaterThanOrEqual(1)
            ->and(Video::where('status', VideoStatus::DRAFT->value)->count())->toBeGreaterThanOrEqual(1)
            // Content that was never public shouldn't appear to have accrued real viewers.
            ->and(Video::whereIn('status', $nonPublishedStatuses)->where('views', '>', 0)->count())->toBe(0)
            ->and(UserSubscription::count())->toBeGreaterThan(0)
            ->and(UserVideoReaction::count())->toBeGreaterThan(0)
            ->and(WatchHistory::count())->toBeGreaterThan(0)
            ->and(Comment::count())->toBeGreaterThan(0);
    });

    test('is idempotent across repeated runs', function () {
        $this->seed(DemoContentSeeder::class);
        $firstCount = Video::count();

        $this->seed(DemoContentSeeder::class);

        expect(Video::count())->toBe($firstCount);
    });
});
