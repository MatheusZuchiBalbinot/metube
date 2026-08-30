<?php

declare(strict_types=1);

use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Events\CommentCreated;
use App\Events\CommentLiked;
use App\Events\SearchPerformed;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoFinished;
use App\Events\VideoImpressionsBatch;
use App\Events\VideoLiked;
use App\Events\VideoPublished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoSkipped;
use App\Events\VideoStatusUpdated;
use App\Events\VideoTranscriptionCompleted;
use App\Events\VideoTranscriptionStarted;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Events\VideoViewed;
use App\Listeners\InvalidateCacheSubscriber;
use App\Listeners\LogImpressionsBatch;
use App\Listeners\LogUserAnalytic;
use App\Listeners\SendCommentLikedNotification;
use App\Listeners\SendCommentRepliedNotification;
use App\Listeners\SendNewSubscriberNotification;
use App\Listeners\SendVideoLikedNotification;
use App\Listeners\SendVideoProcessedNotification;
use App\Listeners\SendVideoPublishedNotifications;
use App\Listeners\SendVideoTranscriptionCompletedListener;
use App\Listeners\SendVideoTranscriptionStartedListener;
use App\Listeners\TranscribeVideoListener;
use Illuminate\Support\Facades\Event;

/**
 * Every Event::listen()/Event::subscribe() call in AppServiceProvider is normally
 * exercised only indirectly, through tests that fake the event and assert it was
 * dispatched. None of those prove the listener is actually registered — a typo'd
 * class name or a listener dropped from registerEventListeners() would still leave
 * every existing test green.
 *
 * Event::assertListening() only exists on EventFake, so Event::fake() is required
 * here — but it does not weaken the assertion: EventFake retains a reference to the
 * real dispatcher it wraps (already booted with every AppServiceProvider listener
 * registered) and assertListening() reads directly from that real listener list,
 * not from anything the fake intercepts.
 */
describe('domain event wiring', function () {
    beforeEach(function () {
        Event::fake();
    });

    test('analytics logging events are all wired to LogUserAnalytic', function () {
        $loggableEvents = [
            VideoViewed::class,
            VideoReactionApplied::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoSkipped::class,
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoClickedFromFeed::class,
            ChannelSubscribed::class,
            ChannelUnsubscribed::class,
            SearchPerformed::class,
        ];

        foreach ($loggableEvents as $eventClass) {
            Event::assertListening($eventClass, LogUserAnalytic::class);
        }
    });

    test('VideoImpressionsBatch is wired to LogImpressionsBatch', function () {
        Event::assertListening(VideoImpressionsBatch::class, LogImpressionsBatch::class);
    });

    test('CommentCreated is wired to SendCommentRepliedNotification', function () {
        Event::assertListening(CommentCreated::class, SendCommentRepliedNotification::class);
    });

    test('CommentLiked is wired to SendCommentLikedNotification', function () {
        Event::assertListening(CommentLiked::class, SendCommentLikedNotification::class);
    });

    test('VideoLiked is wired to SendVideoLikedNotification', function () {
        Event::assertListening(VideoLiked::class, SendVideoLikedNotification::class);
    });

    test('ChannelSubscribed is wired to SendNewSubscriberNotification', function () {
        Event::assertListening(ChannelSubscribed::class, SendNewSubscriberNotification::class);
    });

    test('VideoPublished is wired to both TranscribeVideoListener and SendVideoPublishedNotifications', function () {
        Event::assertListening(VideoPublished::class, TranscribeVideoListener::class);
        Event::assertListening(VideoPublished::class, SendVideoPublishedNotifications::class);
    });

    test('VideoStatusUpdated is wired to SendVideoProcessedNotification', function () {
        Event::assertListening(VideoStatusUpdated::class, SendVideoProcessedNotification::class);
    });

    test('transcription lifecycle events are wired to their respective listeners', function () {
        Event::assertListening(VideoTranscriptionStarted::class, SendVideoTranscriptionStartedListener::class);
        Event::assertListening(VideoTranscriptionCompleted::class, SendVideoTranscriptionCompletedListener::class);
    });

    test('InvalidateCacheSubscriber is wired to the events it needs to bridge raw-DB writes', function () {
        Event::assertListening(ChannelSubscribed::class, [InvalidateCacheSubscriber::class, 'onSubscriptionChanged']);
        Event::assertListening(ChannelUnsubscribed::class, [InvalidateCacheSubscriber::class, 'onSubscriptionChanged']);
        Event::assertListening(VideoViewed::class, [InvalidateCacheSubscriber::class, 'onVideoViewed']);
    });
});
