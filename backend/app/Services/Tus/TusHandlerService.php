<?php

declare(strict_types=1);

namespace App\Services\Tus;

use App\Contracts\TusResolverContract;
use App\Contracts\VideoStorageContract;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use TusPhp\Tus\Server as TusServer;

/**
 * TusHandlerService — Orchestrates the tus protocol server and caches upload ownership.
 *
 * Responsible for:
 * - Ensuring the upload directory exists with correct permissions
 * - Creating and configuring a TusServer instance
 * - Registering event listeners to track upload ownership
 *
 * The controller delegates all tus protocol handling to this service, keeping
 * the controller thin and focused on HTTP routing. The authenticated user ID
 * is passed in explicitly so this service remains testable without an active
 * HTTP context.
 */
final class TusHandlerService
{
    public function __construct(
        private readonly TusResolverContract $resolver,
        private readonly VideoStorageContract $storage,
    ) {}

    /**
     * Handle a tus protocol request by delegating to the configured server.
     *
     * @param int $userId Authenticated user ID — used to track upload ownership
     *
     * @return SymfonyResponse The tus-php response to be sent to the client
     */
    public function handle(int $userId): SymfonyResponse
    {
        $uploadDir = config('tus.upload_dir');

        if (!is_dir($uploadDir)) {
            $this->storage->ensureDirectoryExists('uploads/tus');
        }

        $server = new TusServer('redis');
        $server
            ->setApiPath(config('tus.api_path'))
            ->setUploadDir($uploadDir)
            ->setMaxUploadSize(config('tus.max_size'));

        $ttl = (int) config('tus.ttl');

        $server->event()->addListener(
            'tus-server.upload.created',
            function ($event) use ($userId, $ttl): void {
                $key = $event->getFile()->getKey();
                $this->resolver->cacheOwner($key, $userId, $ttl);
            },
        );

        return $server->serve();
    }
}
