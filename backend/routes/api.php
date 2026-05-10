<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Route;

// ============================================================================
// Public Routes
// ============================================================================

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
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

    // User Interactions
    Route::prefix('users/me')->group(function (): void {
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

    Route::prefix('comments/{cuid}')->group(function (): void {
        Route::patch('/', [CommentController::class, 'update']);
        Route::delete('/', [CommentController::class, 'destroy']);
        Route::post('/like', [CommentController::class, 'toggleLike']);
        Route::get('/replies', [CommentController::class, 'replies']);
        Route::get('/versions', [CommentController::class, 'versions']);
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
