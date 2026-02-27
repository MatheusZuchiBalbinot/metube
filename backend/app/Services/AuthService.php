<?php

namespace App\Services;

use App\Exceptions\InvalidCredentialsException;
use App\Models\User;

class AuthService
{
    /**
     * Attempt login and return token data + authenticated user.
     *
     * @param  array{email: string, password: string}  $credentials
     * @return array{access_token: string, token_type: string, expires_in: int, user: User}
     *
     * @throws InvalidCredentialsException
     */
    public function login(array $credentials): array
    {
        $token = auth('api')->attempt($credentials);

        if (! $token) {
            throw new InvalidCredentialsException();
        }

        /** @var User $user */
        $user = auth('api')->user();

        return array_merge($this->tokenPayload($token), ['user' => $user]);
    }

    /**
     * Invalidate the current token (logout).
     */
    public function logout(): void
    {
        auth('api')->logout();
    }

    /**
     * Refresh the current token and return new token data.
     *
     * @return array{access_token: string, token_type: string, expires_in: int}
     */
    public function refresh(): array
    {
        return $this->tokenPayload(auth('api')->refresh());
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(): User
    {
        /** @var User $user */
        $user = auth('api')->user();

        return $user;
    }

    /**
     * Build the standard token response payload.
     *
     * @return array{access_token: string, token_type: string, expires_in: int}
     */
    private function tokenPayload(string $token): array
    {
        return [
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => auth('api')->factory()->getTTL() * 60,
        ];
    }
}
