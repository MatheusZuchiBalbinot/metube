<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

/**
 * Compares the session_version stored in the session against the user's
 * current session_version in the database, so that a single logout action
 * can force logout across all of that user's open tabs.
 */
class CheckSessionVersion
{
    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user === null) {
            return $next($request);
        }

        $hasSessionVersionMismatch = Session::isStarted()
            && session()->has('session_version')
            && $user->session_version !== session('session_version');

        if ($hasSessionVersionMismatch) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
            }

            return response()->json(['message' => trans('auth.session_expired')], 401);
        }

        return $next($request);
    }
}
