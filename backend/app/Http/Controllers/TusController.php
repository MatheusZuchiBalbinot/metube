<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\Tus\TusHandlerService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * TusController — Routes resumable file uploads via the tus protocol.
 *
 * All tus verbs (POST / HEAD / PATCH / DELETE / OPTIONS) are routed here.
 * Authentication is enforced by the auth:sanctum middleware declared in api.php,
 * so by the time this controller runs, auth()->id() is always set.
 *
 * The actual protocol handling is delegated to {@see TusHandlerService}.
 */
class TusController extends Controller
{
    /**
     * $request is passed through but unused directly — tus-php reads from the
     * global Symfony request internally. The tus-php Symfony response it
     * returns is rendered transparently by Laravel.
     */
    public function handle(Request $request, TusHandlerService $tusHandler): SymfonyResponse
    {
        return $tusHandler->handle((int) auth()->id());
    }
}
