<?php

namespace App\Providers;

use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Events\CommentCreated;
use App\Events\CommentLiked;
use App\Events\SearchPerformed;
use App\Events\VideoClickedFromFeed;
use App\Events\VideoFinished;
use App\Events\VideoImpressed;
use App\Events\VideoImpressionsBatch;
use App\Events\VideoLiked;
use App\Events\VideoPublished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoSkipped;
use App\Events\VideoUndisliked;
use App\Events\VideoUnliked;
use App\Events\VideoUnsaved;
use App\Events\VideoViewed;
use App\Listeners\LogImpressionsBatch;
use App\Listeners\LogUserAnalytic;
use App\Listeners\SendCommentLikedNotification;
use App\Listeners\SendCommentRepliedNotification;
use App\Listeners\SendNewSubscriberNotification;
use App\Listeners\SendVideoLikedNotification;
use App\Listeners\SendVideoPublishedNotifications;
use App\Models\Comment;
use App\Models\Playlist;
use App\Models\Video;
use App\Policies\CommentPolicy;
use App\Policies\PlaylistPolicy;
use App\Policies\VideoPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perMinute(10)->by($request->input('email').'|login'),
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
        Event::listen(VideoPublished::class, SendVideoPublishedNotifications::class);
    }
}
