<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\TusController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────────────────

Route::prefix('sessions')->group(function (): void {
    Route::post('/', [AuthController::class, 'login'])->middleware('throttle:login');
});

Route::prefix('users')->group(function (): void {
    Route::post('/', [AuthController::class, 'register']);
});

// Guest-accessible reads (no auth required; auth()->user() is null for guests)
Route::get('/recommendations', [VideoController::class, 'recommendations']);

Route::prefix('videos')->group(function (): void {
    Route::get('/', [VideoController::class, 'index']);
    Route::get('/{vuid}', [VideoController::class, 'show']);
    Route::get('/{vuid}/summary', [VideoController::class, 'summary']);
    Route::get('/{vuid}/transcription', [VideoController::class, 'transcription']);
    Route::prefix('{vuid}/comments')->group(function (): void {
        Route::get('/', [CommentController::class, 'index']);
    });
});

Route::prefix('channels/{uuid}')->group(function (): void {
    Route::get('/', [ChannelController::class, 'show']);
    Route::get('/videos', [ChannelController::class, 'videos']);
});

Route::prefix('password-resets')->middleware('throttle:password-reset')->group(function (): void {
    Route::post('/', [AuthController::class, 'forgotPassword']);
    Route::patch('/{token}', [AuthController::class, 'resetPassword']);
});

// ── Protected (auth:sanctum + session.version) ────────────────────────────────

Broadcast::routes(['middleware' => ['auth:sanctum', 'session.version']]);

Route::middleware(['auth:sanctum', 'session.version'])->group(function (): void {
    Route::prefix('sessions')->group(function (): void {
        Route::get('/current', [AuthController::class, 'me']);
        Route::delete('/current', [AuthController::class, 'logout']);
    });

    Route::prefix('users')->group(function (): void {
        Route::patch('/{uuid}', [AuthController::class, 'updateProfile']);

        Route::prefix('me')->group(function (): void {
            Route::get('/likes', [UserController::class, 'likes']);
            Route::get('/saved', [UserController::class, 'saved']);
            Route::get('/subscriptions', [UserController::class, 'subscriptions']);
            Route::get('/progress', [UserController::class, 'progress']);

            Route::prefix('history')->group(function (): void {
                Route::get('/', [UserController::class, 'history']);
                Route::get('/events', [UserController::class, 'historyEvents']);
                Route::delete('/', [UserController::class, 'clearHistory']);
                Route::delete('/{vuid}', [UserController::class, 'removeHistory']);
            });
        });
    });

    Route::prefix('email-verifications')->middleware('throttle:email-verification')->group(function (): void {
        Route::get('/{id}/{hash}', [AuthController::class, 'verifyEmail'])
            ->middleware('signed')
            ->name('verification.verify');
        Route::post('/', [AuthController::class, 'resendVerification']);
    });

    Route::prefix('uploads')->group(function (): void {
        Route::any('/tus{suffix?}', [TusController::class, 'handle'])
            ->where('suffix', '.*');
    });

    Route::prefix('videos')->group(function (): void {
        Route::post('/', [VideoController::class, 'store']);
        Route::patch('/{vuid}', [VideoController::class, 'update']);
        Route::delete('/{vuid}', [VideoController::class, 'destroy']);

        Route::post('/{vuid}/views', [VideoController::class, 'recordView']);
        Route::post('/{vuid}/like', [VideoController::class, 'toggleLike']);
        Route::post('/{vuid}/dislike', [VideoController::class, 'toggleDislike']);
        Route::post('/{vuid}/save', [VideoController::class, 'toggleSave']);
        Route::put('/{vuid}/progress', [VideoController::class, 'updateProgress']);
        Route::post('/{vuid}/publish', [VideoController::class, 'publish']);
        Route::post('/{vuid}/transcription/retry', [VideoController::class, 'retryTranscription']);
        Route::get('/{vuid}/ai-suggestion', [VideoController::class, 'aiSuggestion']);
        Route::post('/{vuid}/ai-suggestion/accept', [VideoController::class, 'acceptSuggestion']);
        Route::post('/{vuid}/ai-suggestion/dismiss', [VideoController::class, 'dismissSuggestion']);

        Route::prefix('{vuid}/comments')->group(function (): void {
            Route::post('/', [CommentController::class, 'store']);
        });
    });

    Route::prefix('comments/{comment}')->group(function (): void {
        Route::patch('/', [CommentController::class, 'update']);
        Route::delete('/', [CommentController::class, 'destroy']);
        Route::post('/like', [CommentController::class, 'toggleLike']);
        Route::get('/replies', [CommentController::class, 'replies']);
        Route::get('/versions', [CommentController::class, 'versions']);
    });

    Route::prefix('channels/{uuid}')->group(function (): void {
        Route::post('/subscription', [ChannelController::class, 'toggleSubscription']);
    });

    Route::prefix('playlists')->group(function (): void {
        Route::get('/', [PlaylistController::class, 'index']);
        Route::post('/', [PlaylistController::class, 'store']);
        Route::get('/{puid}', [PlaylistController::class, 'show']);
        Route::patch('/{puid}', [PlaylistController::class, 'update']);
        Route::delete('/{puid}', [PlaylistController::class, 'destroy']);

        Route::prefix('{puid}/videos')->group(function (): void {
            Route::get('/', [PlaylistController::class, 'listVideos']);
            Route::post('/', [PlaylistController::class, 'addVideo']);
            Route::put('/', [PlaylistController::class, 'reorderVideos']);
            Route::delete('/{vuid}', [PlaylistController::class, 'removeVideo']);
        });
    });

    Route::prefix('notifications')->group(function (): void {
        Route::get('/', [NotificationsController::class, 'index']);
        Route::get('/unread-count', [NotificationsController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationsController::class, 'readAll']);
        Route::post('/{notification}/read', [NotificationsController::class, 'markRead']);
        Route::delete('/{notification}', [NotificationsController::class, 'destroy']);
    });

    Route::prefix('analytics')->group(function (): void {
        Route::post('/impressions', [AnalyticsController::class, 'impressions']);
        Route::post('/clicks', [AnalyticsController::class, 'click']);
        Route::post('/searches', [AnalyticsController::class, 'search']);
        Route::post('/skips', [AnalyticsController::class, 'skip']);
    });
});
