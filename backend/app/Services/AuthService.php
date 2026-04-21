<?php

namespace App\Services;

use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    /**
     * Attempt login, regenerate session, and return the authenticated user.
     *
     * @param  array{email: string, password: string}  $credentials
     *
     * @throws InvalidCredentialsException
     */
    public function login(array $credentials): User
    {
        if (! Auth::attempt($credentials)) {
            throw new InvalidCredentialsException;
        }

        /** @var User $user */
        $user = Auth::user();

        if (request()->hasSession()) {
            request()->session()->regenerate();
            session(['session_version' => $user->session_version]);
        }

        return $user;
    }

    /**
     * Logout the current user and invalidate the session.
     */
    public function logout(): void
    {
        Auth::guard('web')->logout();

        if (request()->hasSession()) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(): User
    {
        /** @var User $user */
        $user = Auth::user();

        return $user;
    }
}
