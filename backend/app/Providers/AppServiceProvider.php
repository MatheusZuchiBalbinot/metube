<?php

declare(strict_types=1);

namespace App\Providers;

use App\AI\Clients\GeminiClient;
use App\AI\Contracts\AiClient;
use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Events\CommentCreated;
use App\Events\CommentLiked;
use App\Events\SearchPerformed;
use App\Events\TranscriptionStatusUpdated;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoFinished;
use App\Events\VideoImpressed;
use App\Events\VideoImpressionsBatch;
use App\Events\VideoLiked;
use App\Events\VideoPublished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoSkipped;
use App\Events\VideoStatusUpdated;
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
use App\Listeners\SendVideoTranscribedNotification;
use App\Listeners\TranscribeVideoListener;
use App\Models\Comment;
use App\Models\Playlist;
use App\Models\User;
use App\Models\Video;
use App\Observers\PlaylistObserver;
use App\Observers\UserObserver;
use App\Observers\VideoObserver;
use App\Policies\CommentPolicy;
use App\Policies\PlaylistPolicy;
use App\Policies\VideoPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AiClient::class, GeminiClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perMinute(10)->by($request->input('email') . '|login'),
            ];
        });

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(6)->by($request->ip());
        });

        RateLimiter::for('email-verification', function (Request $request) {
            return Limit::perMinute(6)->by($request->ip());
        });

        Gate::policy(Video::class, VideoPolicy::class);
        Gate::policy(Playlist::class, PlaylistPolicy::class);
        Gate::policy(Comment::class, CommentPolicy::class);

        Video::observe(VideoObserver::class);
        Playlist::observe(PlaylistObserver::class);
        User::observe(UserObserver::class);

        Horizon::auth(function (Request $request): bool {
            return app()->isLocal();
        });

        $loggableEvents = [
            VideoViewed::class,
            VideoReactionApplied::class,
            VideoSaved::class,
            VideoFinished::class,
            VideoSkipped::class,
            VideoUnliked::class,
            VideoUndisliked::class,
            VideoUnsaved::class,
            VideoImpressed::class,
            VideoClickedFromFeed::class,
            ChannelSubscribed::class,
            ChannelUnsubscribed::class,
            SearchPerformed::class,
        ];

        foreach ($loggableEvents as $eventClass) {
            Event::listen($eventClass, LogUserAnalytic::class);
        }

        Event::listen(VideoImpressionsBatch::class, LogImpressionsBatch::class);

        Event::listen(CommentCreated::class, SendCommentRepliedNotification::class);
        Event::listen(CommentLiked::class, SendCommentLikedNotification::class);
        Event::listen(VideoLiked::class, SendVideoLikedNotification::class);
        Event::listen(ChannelSubscribed::class, SendNewSubscriberNotification::class);
        Event::listen(VideoPublished::class, TranscribeVideoListener::class);
        Event::listen(VideoPublished::class, SendVideoPublishedNotifications::class);
        Event::listen(VideoStatusUpdated::class, SendVideoProcessedNotification::class);
        Event::listen(TranscriptionStatusUpdated::class, SendVideoTranscribedNotification::class);

        Event::subscribe(InvalidateCacheSubscriber::class);
    }
}
