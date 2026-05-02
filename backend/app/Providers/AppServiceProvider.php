<?php

namespace App\Providers;

use App\Events\VideoFinished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoViewed;
use App\Listeners\LogUserAnalytic;
use App\Models\Playlist;
use App\Models\Video;
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
            return Limit::perMinute(5)->by($request->ip());
        });

        Gate::policy(Video::class, VideoPolicy::class);
        Gate::policy(Playlist::class, PlaylistPolicy::class);

        Event::listen(VideoViewed::class, LogUserAnalytic::class);
        Event::listen(VideoReactionApplied::class, LogUserAnalytic::class);
        Event::listen(VideoSaved::class, LogUserAnalytic::class);
        Event::listen(VideoFinished::class, LogUserAnalytic::class);
    }
}
