<?php

declare(strict_types=1);

use App\DTOs\VideoListFilterDTO;
use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoService;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

describe('VideoService — read', function () {
    test('list videos returns paginated results', function () {
        Video::factory(20)->create(['status' => VideoStatus::PUBLISHED]);

        $result = app(VideoService::class)->listVideos(new VideoListFilterDTO());

        expect($result->count())->toBe(15);
        expect($result->hasPages())->toBeTrue();
    });

    test('list videos excludes non-published videos', function () {
        Video::factory(3)->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory(2)->create(['status' => VideoStatus::PROCESSING]);
        Video::factory()->create(['status' => VideoStatus::FAILED]);

        $result = app(VideoService::class)->listVideos(new VideoListFilterDTO());

        expect($result->total())->toBe(3);
    });

    test('get video by uuid returns correct video', function () {
        $video = Video::factory()->create();

        $found = app(VideoService::class)->getVideoByUuid($video->vuid);

        expect($found->id)->toBe($video->id);
    });

    test('list videos with a non-published status filter scopes to the requesting user\'s own channel', function () {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        Video::factory(2)->for($owner, 'channel')->create(['status' => VideoStatus::DRAFT]);
        Video::factory(3)->for($otherOwner, 'channel')->create(['status' => VideoStatus::DRAFT]);

        $result = app(VideoService::class)->listVideos(
            new VideoListFilterDTO(status: VideoStatus::DRAFT->value),
            $owner,
        );

        expect($result->total())->toBe(2);

        foreach ($result->items() as $video) {
            expect($video->channel_id)->toBe($owner->id);
        }
    });

    test('list videos with a non-published status filter and no user returns nothing', function () {
        Video::factory(3)->create(['status' => VideoStatus::DRAFT]);

        $result = app(VideoService::class)->listVideos(
            new VideoListFilterDTO(status: VideoStatus::DRAFT->value),
            null,
        );

        expect($result->total())->toBe(0);
    });

    test('list videos with an explicit published status filter is not scoped to a user', function () {
        Video::factory(4)->create(['status' => VideoStatus::PUBLISHED]);

        $result = app(VideoService::class)->listVideos(
            new VideoListFilterDTO(status: VideoStatus::PUBLISHED->value),
            null,
        );

        expect($result->total())->toBe(4);
    });
});
