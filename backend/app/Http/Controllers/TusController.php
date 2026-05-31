<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use TusPhp\Tus\Server as TusServer;

/**
 * TusController — Handles resumable file uploads via the tus protocol.
 *
 * All tus verbs (POST / HEAD / PATCH / DELETE / OPTIONS) are routed here.
 * Authentication is enforced by the auth:sanctum middleware declared in api.php,
 * so by the time this controller runs, auth()->id() is always set.
 */
class TusController extends Controller
{
    /**
     * Handle any tus protocol request.
     *
     * @param Request $request Incoming Laravel request (passed through but tus-php reads
     *                         from the global Symfony request internally)
     *
     * @return SymfonyResponse tus-php Symfony response (Laravel renders it transparently)
     */
    public function handle(Request $request): SymfonyResponse
    {
        $uploadDir = config('tus.upload_dir');

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0775, true);
        }

        $server = new TusServer('redis');
        $server
            ->setApiPath(config('tus.api_path'))
            ->setUploadDir($uploadDir)
            ->setMaxUploadSize(config('tus.max_size'));

        $userId = auth()->id();

        $server->event()->addListener(
            'tus-server.upload.created',
            function ($event) use ($userId): void {
                $key = $event->getFile()->getKey();
                Cache::put("tus:owner:{$key}", $userId, config('tus.ttl'));
            },
        );

        return $server->serve();
    }
}
