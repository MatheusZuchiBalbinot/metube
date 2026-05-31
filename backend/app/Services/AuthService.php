<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Attempt login, regenerate session, and return the authenticated user.
     *
     * @param array{email: string, password: string} $credentials
     *
     * @throws InvalidCredentialsException
     */
    public function login(array $credentials): User
    {
        if (!Auth::attempt($credentials)) {
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

    /**
     * Update the authenticated user's profile fields.
     *
     * @param array<string, mixed> $data Validated: name?, bio?
     */
    public function updateProfile(array $data): User
    {
        /** @var User $user */
        $user = Auth::user();
        $user->update($data);

        return $user;
    }

    /**
     * Register a new user, auto-login, and dispatch the Registered event.
     *
     * @param array{name: string, email: string, password: string} $data
     */
    public function register(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        event(new Registered($user));

        Auth::login($user);

        if (request()->hasSession()) {
            request()->session()->regenerate();
            session(['session_version' => $user->session_version]);
        }

        return $user;
    }

    /**
     * Send a password reset link to the given email address.
     *
     * @throws ValidationException if the email is not found or the request is rate-limited
     */
    public function sendPasswordResetLink(string $email): void
    {
        $status = Password::broker()->sendResetLink(['email' => $email]);
        $isSent = $status === Password::RESET_LINK_SENT;

        if (!$isSent) {
            throw ValidationException::withMessages(['email' => [trans($status)]]);
        }
    }

    /**
     * Reset the user's password using the given token.
     *
     * @param array{token: string, email: string, password: string} $data
     *
     * @throws ValidationException if the token is invalid or expired
     */
    public function resetPassword(array $data): void
    {
        $status = Password::broker()->reset($data, function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password)])->save();
        });

        $isReset = $status === Password::PASSWORD_RESET;

        if (!$isReset) {
            throw ValidationException::withMessages(['email' => [trans($status)]]);
        }
    }
}
