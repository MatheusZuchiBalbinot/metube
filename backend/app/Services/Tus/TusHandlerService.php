<?php

declare(strict_types=1);

namespace App\Services\Tus;

use App\Contracts\StorageContract;
use App\Contracts\TusResolverContract;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use TusPhp\Tus\Server as TusServer;

/**
 * Orchestrates the tus protocol server and caches upload ownership, rejecting
 * HEAD/PATCH/DELETE against an upload session owned by another user.
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
        private readonly StorageContract $storage,
    ) {}

    /**
     * Handle a tus protocol request by delegating to the configured server.
     *
     * Ownership is checked up front (before any byte is read or written) for
     * every request that targets an existing upload session — i.e. every
     * request whose path carries a key beyond the bare API path. Without this,
     * any authenticated user who learns another user's upload key could inject
     * bytes into, or cancel, that in-progress upload: ownership was previously
     * only checked much later at finalization, after the damage was already done.
     * The initial "upload.created" request has no key yet (the server mints one
     * during creation), so it is naturally exempt from the check.
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException 403 when the request
     *                                                               targets an upload session owned by a different user
     */
    public function handle(int $userId): SymfonyResponse
    {
        $uploadDir = config('tus.upload_dir');

        if (!is_dir($uploadDir)) {
            $this->storage->ensureDirectoryExists('uploads/tus');
        }

        $key = $this->extractKeyFromPath();

        if ($key !== null) {
            $this->assertOwnership($key, $userId);
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

    /**
     * Requests to the bare API path (upload creation, OPTIONS discovery) carry
     * no key — the key is minted by tus-php only once creation succeeds.
     */
    private function extractKeyFromPath(): ?string
    {
        $apiPath = trim((string) config('tus.api_path'), '/');
        $path = trim(request()->path(), '/');
        $suffix = trim(Str::after($path, $apiPath), '/');

        return $suffix !== '' ? $suffix : null;
    }

    private function assertOwnership(string $key, int $userId): void
    {
        $isOwner = $this->resolver->getOwner($key) === $userId;

        abort_if(!$isOwner, 403, 'You do not own this upload session.');
    }
}
