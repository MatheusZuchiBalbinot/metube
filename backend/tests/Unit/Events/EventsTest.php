<?php

use App\Enums\TranscriptionStatus;
use App\Enums\VideoEventType;
use App\Enums\VideoSource;
use App\Enums\VideoStatus;
use App\Events\AiSuggestionReady;
use App\Events\ChannelUnsubscribed;
use App\Events\CommentCreated;
use App\Events\TranscriptionStatusUpdated;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoFinished;
use App\Events\VideoLiked;
use App\Events\VideoSaved;
use App\Events\VideoStatusUpdated;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Models\Comment;
use App\Models\User;
use App\Models\Video;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

describe('AiSuggestionReady', function () {
    test('broadcastOn returns channel for video owner', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new AiSuggestionReady($video);

        $channel = $event->broadcastOn();

        expect($channel)->toBeInstanceOf(PrivateChannel::class)
            ->and($channel->name)->toContain($user->uuid);
    });

    test('broadcastWith contains vuid and title', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['title' => 'My AI Video']);
        $event = new AiSuggestionReady($video);

        $payload = $event->broadcastWith();

        expect($payload['vuid'])->toBe($video->vuid)
            ->and($payload['title'])->toBe('My AI Video');
    });

    test('broadcastAs returns AiSuggestionReady', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new AiSuggestionReady($video);

        expect($event->broadcastAs())->toBe('AiSuggestionReady');
    });
});

describe('ChannelUnsubscribed', function () {
    test('toAnalyticRow returns correct event type and user ids', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();
        $event = new ChannelUnsubscribed($subscriber, $channel);

        $row = $event->toAnalyticRow();

        expect($row['user_id'])->toBe($subscriber->id)
            ->and($row['channel_id'])->toBe($channel->id)
            ->and($row['event_type'])->toBe(VideoEventType::UNSUBSCRIBE->value);
    });

    test('implements LoggableUserEvent', function () {
        $subscriber = User::factory()->create();
        $channel = User::factory()->create();
        $event = new ChannelUnsubscribed($subscriber, $channel);

        expect($event)->toBeInstanceOf(\App\Contracts\LoggableUserEvent::class);
    });
});

describe('CommentCreated', function () {
    test('broadcastOn returns video channel', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();
        $event = new CommentCreated($comment, $user, $video, 5);

        $channels = $event->broadcastOn();

        expect($channels)->toBeArray()
            ->and($channels[0])->toBeInstanceOf(Channel::class)
            ->and($channels[0]->name)->toBe("videos.{$video->vuid}");
    });

    test('broadcastWith returns comment count', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();
        $event = new CommentCreated($comment, $user, $video, 42);

        $payload = $event->broadcastWith();

        expect($payload['comment_count'])->toBe(42);
    });

    test('broadcastAs returns CommentCreated', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();
        $event = new CommentCreated($comment, $user, $video, 1);

        expect($event->broadcastAs())->toBe('CommentCreated');
    });

    test('stores comment, author, video, and count', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $comment = Comment::factory()->for($video)->for($user, 'user')->create();
        $event = new CommentCreated($comment, $user, $video, 7);

        expect($event->comment->id)->toBe($comment->id)
            ->and($event->author->id)->toBe($user->id)
            ->and($event->video->id)->toBe($video->id)
            ->and($event->commentCount)->toBe(7);
    });
});

describe('TranscriptionStatusUpdated', function () {
    test('broadcastOn returns video channel and private user channel', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING);

        $channels = $event->broadcastOn();

        expect($channels)->toHaveCount(2)
            ->and($channels[0])->toBeInstanceOf(Channel::class)
            ->and($channels[1])->toBeInstanceOf(PrivateChannel::class);
    });

    test('broadcastWith contains vuid and status', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED);

        $payload = $event->broadcastWith();

        expect($payload['vuid'])->toBe($video->vuid)
            ->and($payload['status'])->toBe(TranscriptionStatus::COMPLETED->value);
    });

    test('broadcastWith includes started_at and estimated_seconds when provided', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $startedAt = Carbon::now();
        $event = new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING, $startedAt, 120.0);

        $payload = $event->broadcastWith();

        expect($payload['started_at'])->not->toBeNull()
            ->and($payload['estimated_seconds'])->toBe(120.0);
    });

    test('broadcastWith has null started_at when not provided', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new TranscriptionStatusUpdated($video, TranscriptionStatus::PENDING);

        $payload = $event->broadcastWith();

        expect($payload['started_at'])->toBeNull()
            ->and($payload['estimated_seconds'])->toBeNull();
    });

    test('broadcastAs returns TranscriptionStatusUpdated', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new TranscriptionStatusUpdated($video, TranscriptionStatus::PENDING);

        expect($event->broadcastAs())->toBe('TranscriptionStatusUpdated');
    });
});

describe('VideoClickedFromFeed', function () {
    test('toAnalyticRow returns correct event type and ids', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoClickedFromFeed($user, $video, VideoSource::FEED);

        $row = $event->toAnalyticRow();

        expect($row['user_id'])->toBe($user->id)
            ->and($row['video_id'])->toBe($video->id)
            ->and($row['event_type'])->toBe(VideoEventType::CLICK->value)
            ->and($row['source'])->toBe(VideoSource::FEED->value);
    });

    test('toAnalyticRow includes position when provided', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoClickedFromFeed($user, $video, VideoSource::SEARCH, 3, 'session-abc');

        $row = $event->toAnalyticRow();

        expect($row['payload'])->toBe(['position' => 3])
            ->and($row['session_id'])->toBe('session-abc');
    });

    test('toAnalyticRow payload is null when no position', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoClickedFromFeed($user, $video, VideoSource::FEED);

        $row = $event->toAnalyticRow();

        expect($row['payload'])->toBeNull();
    });

    test('implements LoggableUserEvent', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoClickedFromFeed($user, $video, VideoSource::FEED);

        expect($event)->toBeInstanceOf(\App\Contracts\LoggableUserEvent::class);
    });
});

describe('VideoFinished', function () {
    test('toAnalyticRow returns correct event type', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoFinished($user, $video);

        $row = $event->toAnalyticRow();

        expect($row['user_id'])->toBe($user->id)
            ->and($row['video_id'])->toBe($video->id)
            ->and($row['event_type'])->toBe(VideoEventType::FINISH->value);
    });

    test('implements LoggableUserEvent', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoFinished($user, $video);

        expect($event)->toBeInstanceOf(\App\Contracts\LoggableUserEvent::class);
    });
});

describe('VideoLiked', function () {
    test('broadcastOn returns video public channel', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $liker = User::factory()->create();
        $event = new VideoLiked($video, $liker, 10);

        $channels = $event->broadcastOn();

        expect($channels[0])->toBeInstanceOf(Channel::class)
            ->and($channels[0]->name)->toBe("videos.{$video->vuid}");
    });

    test('broadcastWith returns like_count', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $liker = User::factory()->create();
        $event = new VideoLiked($video, $liker, 42);

        $payload = $event->broadcastWith();

        expect($payload['like_count'])->toBe(42);
    });

    test('broadcastAs returns VideoLiked', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $liker = User::factory()->create();
        $event = new VideoLiked($video, $liker, 1);

        expect($event->broadcastAs())->toBe('VideoLiked');
    });
});

describe('VideoSaved', function () {
    test('toAnalyticRow returns correct event type', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoSaved($user, $video);

        $row = $event->toAnalyticRow();

        expect($row['user_id'])->toBe($user->id)
            ->and($row['video_id'])->toBe($video->id)
            ->and($row['event_type'])->toBe(VideoEventType::SAVE->value);
    });
});

describe('VideoStatusUpdated', function () {
    test('broadcastOn returns private channel for video owner', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoStatusUpdated($video, VideoStatus::PUBLISHED);

        $channels = $event->broadcastOn();

        expect($channels[0])->toBeInstanceOf(PrivateChannel::class)
            ->and($channels[0]->name)->toContain($user->uuid);
    });

    test('broadcastWith returns vuid and status', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoStatusUpdated($video, VideoStatus::FAILED);

        $payload = $event->broadcastWith();

        expect($payload['vuid'])->toBe($video->vuid)
            ->and($payload['status'])->toBe(VideoStatus::FAILED->value);
    });

    test('broadcastAs returns VideoStatusUpdated', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoStatusUpdated($video, VideoStatus::PROCESSING);

        expect($event->broadcastAs())->toBe('VideoStatusUpdated');
    });
});

describe('VideoUndisliked', function () {
    test('toAnalyticRow returns UNDISLIKE event type', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoUndisliked($user, $video);

        $row = $event->toAnalyticRow();

        expect($row['event_type'])->toBe(VideoEventType::UNDISLIKE->value)
            ->and($row['user_id'])->toBe($user->id)
            ->and($row['video_id'])->toBe($video->id);
    });
});

describe('VideoUnliked', function () {
    test('toAnalyticRow returns UNLIKE event type', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoUnliked($user, $video);

        $row = $event->toAnalyticRow();

        expect($row['event_type'])->toBe(VideoEventType::UNLIKE->value)
            ->and($row['user_id'])->toBe($user->id)
            ->and($row['video_id'])->toBe($video->id);
    });
});

describe('VideoUnsaved', function () {
    test('toAnalyticRow returns UNSAVE event type', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $event = new VideoUnsaved($user, $video);

        $row = $event->toAnalyticRow();

        expect($row['event_type'])->toBe(VideoEventType::UNSAVE->value)
            ->and($row['user_id'])->toBe($user->id)
            ->and($row['video_id'])->toBe($video->id);
    });
});
