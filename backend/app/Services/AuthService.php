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

final class AuthService
{
    /**
     * @param array{email: string, password: string} $credentials
     *
     * @throws InvalidCredentialsException
     */
    public function login(array $credentials): User
    {
        if (!Auth::attempt($credentials)) {
            throw new InvalidCredentialsException();
        }

        /** @var User $user */
        $user = Auth::user();

        if (request()->hasSession()) {
            request()->session()->regenerate();
            session(['session_version' => $user->session_version]);
        }

        return $user;
    }

    public function logout(): void
    {
        Auth::guard('web')->logout();

        if (!request()->hasSession()) {
            return;
        }

        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }

    public function me(): User
    {
        $user = Auth::user();
        assert($user instanceof User);

        return $user;
    }

    /**
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
     * Auto-logs in the new user and dispatches the Registered event.
     *
     * @param array{name: string, email: string, password: string} $data
     */
    public function register(array $data): User
    {
        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ];
        $user = User::create($payload);

        event(new Registered($user));

        Auth::login($user);

        if (request()->hasSession()) {
            request()->session()->regenerate();
            session(['session_version' => $user->session_version]);
        }

        return $user;
    }

    /**
     * @throws ValidationException if the email is not found or the request is rate-limited
     */
    public function sendPasswordResetLink(string $email): void
    {
        $payload = ['email' => $email];
        $status = Password::broker()->sendResetLink($payload);
        $isSent = $status === Password::RESET_LINK_SENT;

        if (!$isSent) {
            throw ValidationException::withMessages(['email' => [trans($status)]]);
        }
    }

    /**
     * @param array{token: string, email: string, password: string} $data
     *
     * @throws ValidationException if the token is invalid or expired
     */
    public function resetPassword(array $data): void
    {
        $status = Password::broker()->reset($data, function (User $user, string $password): void {
            $user->update(['password' => Hash::make($password)]);
        });

        $isReset = $status === Password::PASSWORD_RESET;

        if (!$isReset) {
            throw ValidationException::withMessages(['email' => [trans($status)]]);
        }
    }
}
