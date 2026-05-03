<?php

use App\Enums\VideoEventType;
use App\Events\ChannelSubscribed;
use App\Events\SearchPerformed;
use App\Events\VideoImpressed;
use App\Events\VideoReactionApplied;
use App\Events\VideoSkipped;
use App\Events\VideoViewed;
use App\Listeners\LogUserAnalytic;
use App\Models\User;
use App\Models\UserAnalytic;
use App\Models\Video;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('LogUserAnalytic', function () {
    test('listener implements ShouldQueueAfterCommit', function () {
        expect(new LogUserAnalytic)->toBeInstanceOf(ShouldQueueAfterCommit::class);
    });

    test('persists VideoViewed with source and session_id', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new LogUserAnalytic)->handle(new VideoViewed($user, $video, 'feed', 'sess-123'));

        $row = UserAnalytic::firstWhere('user_id', $user->id);

        expect($row)->not->toBeNull()
            ->and($row->event_type)->toBe(VideoEventType::VIEW)
            ->and($row->video_id)->toBe($video->id)
            ->and($row->source)->toBe('feed')
            ->and($row->session_id)->toBe('sess-123');
    });

    test('persists VideoReactionApplied with the supplied type', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new LogUserAnalytic)->handle(new VideoReactionApplied($user, $video, VideoEventType::DISLIKE));

        expect(UserAnalytic::firstWhere('user_id', $user->id)->event_type)->toBe(VideoEventType::DISLIKE);
    });

    test('persists VideoSkipped with payload percent', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new LogUserAnalytic)->handle(new VideoSkipped($user, $video, 7));

        $row = UserAnalytic::firstWhere('user_id', $user->id);

        expect($row->event_type)->toBe(VideoEventType::SKIP)
            ->and($row->payload)->toBe(['percent' => 7]);
    });

    test('persists VideoImpressed with position payload', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create();

        (new LogUserAnalytic)->handle(new VideoImpressed($user, $video, 'recommended', 4, 'sess-x'));

        $row = UserAnalytic::firstWhere('user_id', $user->id);

        expect($row->event_type)->toBe(VideoEventType::IMPRESSION)
            ->and($row->source)->toBe('recommended')
            ->and($row->session_id)->toBe('sess-x')
            ->and($row->payload)->toBe(['position' => 4]);
    });

    test('persists ChannelSubscribed with channel_id and null video_id', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();

        (new LogUserAnalytic)->handle(new ChannelSubscribed($subscriber, $channel));

        $row = UserAnalytic::firstWhere('user_id', $subscriber->id);

        expect($row->event_type)->toBe(VideoEventType::SUBSCRIBE)
            ->and($row->channel_id)->toBe($channel->id)
            ->and($row->video_id)->toBeNull();
    });

    test('persists SearchPerformed with query payload and null video', function () {
        $user = User::factory()->create();

        (new LogUserAnalytic)->handle(new SearchPerformed($user, 'react hooks', 12, 'sess-q'));

        $row = UserAnalytic::firstWhere('user_id', $user->id);

        expect($row->event_type)->toBe(VideoEventType::SEARCH)
            ->and($row->video_id)->toBeNull()
            ->and($row->payload)->toBe(['query' => 'react hooks', 'result_count' => 12])
            ->and($row->session_id)->toBe('sess-q');
    });
});
