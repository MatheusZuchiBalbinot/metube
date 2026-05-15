<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Route;

// ============================================================================
// Public Routes
// ============================================================================

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
    Route::post('/password/reset', [AuthController::class, 'resetPassword']);
});

// ============================================================================
// Protected Routes (Authenticated + Session Validation)
// ============================================================================

Route::middleware(['auth:sanctum', 'session.version'])->group(function (): void {
    // Auth
    Route::prefix('auth')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/me', [AuthController::class, 'updateProfile']);
        Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->middleware('signed')->name('verification.verify');
        Route::post('/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1');
    });

    // Videos
    Route::prefix('videos')->group(function (): void {
        Route::get('/', [VideoController::class, 'index']);
        Route::post('/', [VideoController::class, 'store']);
        Route::get('/{vuid}', [VideoController::class, 'show']);
        Route::patch('/{vuid}', [VideoController::class, 'update']);
        Route::delete('/{vuid}', [VideoController::class, 'destroy']);

        Route::post('/{vuid}/views', [VideoController::class, 'recordView']);
        Route::post('/{vuid}/like', [VideoController::class, 'toggleLike']);
        Route::post('/{vuid}/dislike', [VideoController::class, 'toggleDislike']);
        Route::post('/{vuid}/save', [VideoController::class, 'toggleSave']);
        Route::put('/{vuid}/progress', [VideoController::class, 'updateProgress']);
        Route::get('/{vuid}/summary', [VideoController::class, 'summary']);
    });

    // User library — top-level resources scoped to the authenticated user
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

    // Channels
    Route::prefix('channels/{uuid}')->group(function (): void {
        Route::get('/', [ChannelController::class, 'show']);
        Route::get('/videos', [ChannelController::class, 'videos']);
        Route::post('/subscription', [ChannelController::class, 'toggleSubscription']);
    });

    // Analytics (client-reported events for the recommender)
    Route::prefix('analytics')->group(function (): void {
        Route::post('/impressions', [AnalyticsController::class, 'impressions']);
        Route::post('/clicks', [AnalyticsController::class, 'click']);
        Route::post('/searches', [AnalyticsController::class, 'search']);
        Route::post('/skips', [AnalyticsController::class, 'skip']);
    });

    // Comments
    Route::prefix('videos/{vuid}/comments')->group(function (): void {
        Route::get('/', [CommentController::class, 'index']);
        Route::post('/', [CommentController::class, 'store']);
    });

    Route::prefix('comments/{comment}')->group(function (): void {
        Route::patch('/', [CommentController::class, 'update']);
        Route::delete('/', [CommentController::class, 'destroy']);
        Route::post('/like', [CommentController::class, 'toggleLike']);
        Route::get('/replies', [CommentController::class, 'replies']);
        Route::get('/versions', [CommentController::class, 'versions']);
    });

    // Notifications
    Route::prefix('notifications')->group(function (): void {
        Route::get('/', [NotificationsController::class, 'index']);
        Route::get('/unread-count', [NotificationsController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationsController::class, 'readAll']);
        Route::post('/{notification}/read', [NotificationsController::class, 'markRead']);
        Route::delete('/{notification}', [NotificationsController::class, 'destroy']);
    });

    // Playlists
    Route::prefix('playlists')->group(function (): void {
        Route::get('/', [PlaylistController::class, 'index']);
        Route::post('/', [PlaylistController::class, 'store']);
        Route::get('/{puid}', [PlaylistController::class, 'show']);
        Route::patch('/{puid}', [PlaylistController::class, 'update']);
        Route::delete('/{puid}', [PlaylistController::class, 'destroy']);

        Route::prefix('{puid}/videos')->group(function (): void {
            Route::post('/', [PlaylistController::class, 'addVideo']);
            Route::delete('/{vuid}', [PlaylistController::class, 'removeVideo']);
            Route::put('/', [PlaylistController::class, 'reorderVideos']);
        });
    });
});
