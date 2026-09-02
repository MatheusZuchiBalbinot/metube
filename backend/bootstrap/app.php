<?php

declare(strict_types=1);

use App\Exceptions\InvalidCredentialsException;
use App\Exceptions\VideoNotDraftException;
use App\Http\Middleware\CheckSessionVersion;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Predis\Connection\ConnectionException as PredisConnectionException;

return Application::configure(basePath: dirname(__DIR__))
    ->withEvents(discover: false)
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias(['session.version' => CheckSessionVersion::class]);
        $middleware->validateCsrfTokens(except: ['api/uploads/tus*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidCredentialsException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => $e->getMessage()], 401);
            }
        });

        $exceptions->render(function (VideoNotDraftException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => $e->getMessage()], 409);
            }
        });

        // Sessions, cache, and queues all depend on Redis — without this, a
        // Redis outage surfaces as a raw 500 on every authenticated route
        // instead of a clear "temporarily unavailable" response.
        $exceptions->render(function (RedisException|PredisConnectionException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Service temporarily unavailable.'], 503);
            }
        });
    })->create();
