<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckSessionVersion — Validates session consistency across browser tabs.
 *
 * Ensures session_version stored in session matches the user's current
 * session_version in database. If mismatch, user is logged out (forced logout).
 *
 * This enables forced logout across all open tabs via a single logout action.
 */
class CheckSessionVersion
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request  The incoming HTTP request
     * @param  \Closure(\Illuminate\Http\Request): \Symfony\Component\HttpFoundation\Response  $next  The next middleware/handler
     * @return \Symfony\Component\HttpFoundation\Response HTTP response (401 if session mismatch)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();
        if ($user === null) {
            return $next($request);
        }

        if (
            Session::isStarted()
            && session()->has('session_version')
            && $user->session_version !== session('session_version')
        ) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
            }

            return response()->json(['message' => trans('auth.session_expired')], 401);
        }

        return $next($request);
    }
}
