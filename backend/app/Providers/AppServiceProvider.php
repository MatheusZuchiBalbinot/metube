<?php

declare(strict_types=1);

namespace App\Providers;

use App\AI\Clients\GroqClient;
use App\AI\Contracts\AiClient;
use App\Contracts\StorageContract;
use App\Contracts\TusResolverContract;
use App\Contracts\ViewCounterStore;
use App\Events\ChannelSubscribed;
use App\Events\ChannelUnsubscribed;
use App\Events\CommentCreated;
use App\Events\CommentLiked;
use App\Events\SearchPerformed;
use App\Events\TranscriptionStatusUpdated;
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
use App\Listeners\SendVideoTranscriptionFailedNotification;
use App\Listeners\SendVideoTranscriptionStartedListener;
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
use App\Policies\UserPolicy;
use App\Policies\VideoPolicy;
use App\Services\DatabaseViewCounterStore;
use App\Services\RedisViewCounterStore;
use App\Services\StorageService;
use App\Services\Tus\TusUploadResolver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Horizon\Horizon;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AiClient::class, GroqClient::class);
        $this->app->singleton(GroqClient::class);

        $this->app->bind(StorageContract::class, StorageService::class);
        $this->app->bind(TusResolverContract::class, TusUploadResolver::class);

        // View counting buffers increments in Redis to keep hot videos off the
        // row-lock path. The test/local environment has no Redis and asserts
        // against videos.views synchronously, so it gets the unbuffered store.
        // The branch lives here in the provider — never inside the service.
        $viewCounterStore = $this->app->runningUnitTests()
            ? DatabaseViewCounterStore::class
            : RedisViewCounterStore::class;

        $this->app->bind(ViewCounterStore::class, $viewCounterStore);
    }

    public function boot(): void
    {
        $this->registerRateLimiters();
        $this->registerPolicies();
        $this->registerObservers();

        Password::defaults(fn () => Password::min(8));

        Model::preventLazyLoading(!app()->isProduction());

        Horizon::auth(function (Request $request): bool {
            return app()->isLocal();
        });

        $this->registerEventListeners();
    }

    private function registerRateLimiters(): void
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

        RateLimiter::for('video-chat', function (Request $request) {
            // The chat route is behind auth:sanctum, so the user is always present.
            return [
                Limit::perMinute(20)->by((string) $request->user()->id),
                Limit::perDay(500)->by((string) $request->user()->id),
            ];
        });

        RateLimiter::for('video-upload', function (Request $request) {
            // Bounds how much work one user can push onto the shared transcription/AI queue.
            return Limit::perHour(20)->by((string) $request->user()->id);
        });

        RateLimiter::for('video-publish', function (Request $request) {
            return Limit::perHour(60)->by((string) $request->user()->id);
        });

        RateLimiter::for('transcription-retry', function (Request $request) {
            // Each retry dispatches a real, paid call to the Whisper service.
            return Limit::perHour(5)->by((string) $request->user()->id);
        });
    }

    private function registerPolicies(): void
    {
        Gate::policy(Video::class, VideoPolicy::class);
        Gate::policy(Playlist::class, PlaylistPolicy::class);
        Gate::policy(Comment::class, CommentPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }

    private function registerObservers(): void
    {
        Video::observe(VideoObserver::class);
        Playlist::observe(PlaylistObserver::class);
        User::observe(UserObserver::class);
    }

    private function registerEventListeners(): void
    {
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

        // Transcription events — split to handle STARTED and COMPLETED separately.
        Event::listen(VideoTranscriptionStarted::class, SendVideoTranscriptionStartedListener::class);
        Event::listen(VideoTranscriptionCompleted::class, SendVideoTranscriptionCompletedListener::class);

        Event::listen(TranscriptionStatusUpdated::class, SendVideoTranscriptionFailedNotification::class);

        Event::subscribe(InvalidateCacheSubscriber::class);
    }
}
