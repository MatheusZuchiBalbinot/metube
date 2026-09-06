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

    test('seeds playable HLS packages and generated thumbnails', function () {
        $this->seed(DemoContentSeeder::class);

        $video = Video::where('status', VideoStatus::PUBLISHED->value)
            ->whereNotNull('hls_url')
            ->firstOrFail();

        // thumbnail_url is a disk-relative path to a locally generated SVG cover
        // (see DemoContentSeeder::buildThumbnail()), not a third-party URL.
        expect($video->hls_url)->toEndWith('master.m3u8')
            ->and($video->thumbnail_url)->toStartWith('thumbnails/')
            ->and($video->thumbnail_url)->toEndWith('.svg');
    });

    test('derives video tags from the title instead of copying the channel tags verbatim', function () {
        $this->seed(DemoContentSeeder::class);

        // "Docker for developers" lives on a channel tagged
        // programming/javascript/tutorial, but the video itself is about
        // containers — it should carry its own topical tags, not the
        // channel's, or every video on the channel would read as JavaScript
        // content regardless of what it's actually about.
        $video = Video::where('title', 'Docker for developers')->firstOrFail();

        expect($video->tags)->toContain('docker')
            ->and($video->tags)->not->toBe(['programming', 'javascript', 'tutorial']);
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

    test('seeds notifications that point at real videos and comments, not a placeholder id', function () {
        $this->seed(DemoContentSeeder::class);

        $admin = User::where('email', 'admin@metube.com')->firstOrFail();
        $vuids = Video::pluck('vuid')->all();
        $cuids = Comment::pluck('cuid')->all();

        $referencedVuids = $admin->notifications()
            ->get()
            ->map(fn ($n) => $n->data['vuid'] ?? null)
            ->filter()
            ->values();

        $referencedCuids = $admin->notifications()
            ->get()
            ->map(fn ($n) => $n->data['cuid'] ?? null)
            ->filter()
            ->values();

        expect($referencedVuids)->not->toBeEmpty();

        foreach ($referencedVuids as $vuid) {
            expect($vuids)->toContain($vuid);
        }

        foreach ($referencedCuids as $cuid) {
            expect($cuids)->toContain($cuid);
        }
    });

    test('is idempotent across repeated runs, including the content it generates', function () {
        $this->seed(DemoContentSeeder::class);
        $firstCount = Video::count();
        $firstDescription = Video::where('title', 'Docker for developers')->value('description');
        $firstComment = Comment::orderBy('id')->value('content');

        $this->seed(DemoContentSeeder::class);

        expect(Video::count())->toBe($firstCount)
            ->and(Video::where('title', 'Docker for developers')->value('description'))->toBe($firstDescription)
            ->and(Comment::orderBy('id')->value('content'))->toBe($firstComment);
    });

    test('does not keep piling up engagement rows on every re-seed', function () {
        // Regression test: subscriptions/reactions/comments/playlist entries were
        // picked with plain Collection::random(), which has no seed — every
        // re-run drew a different subset and, since likes/subscriptions/etc. are
        // only ever added (sync WITHOUT detaching, or created outright), the
        // totals grew a little more on every single re-seed instead of
        // converging on a stable demo dataset.
        $this->seed(DemoContentSeeder::class);

        $counts = fn () => [
            'subscriptions' => UserSubscription::count(),
            'reactions' => UserVideoReaction::count(),
            'comments' => Comment::count(),
            'history' => WatchHistory::count(),
        ];

        $first = $counts();

        $this->seed(DemoContentSeeder::class);
        $second = $counts();

        $this->seed(DemoContentSeeder::class);
        $third = $counts();

        expect($second)->toBe($first)
            ->and($third)->toBe($first);
    });
});
