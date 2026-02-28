<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class CheckSessionVersion
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            Auth::check()
            && Session::isStarted()
            && session()->has('session_version')
            && Auth::user()->session_version !== session('session_version')
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
