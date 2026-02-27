<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ─── Login ────────────────────────────────────────────────────────────────────

describe('login', function () {
    it('allows a user to login with valid credentials', function () {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in', 'user'])
            ->assertJsonPath('token_type', 'bearer')
            ->assertJsonPath('user.email', $user->email);
    });

    it('fails with a wrong password', function () {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong_password',
        ])
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    });

    it('fails with a nonexistent email', function () {
        $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'password',
        ])->assertUnauthorized();
    });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validation', function () {
    it('requires an email', function () {
        $this->postJson('/api/auth/login', ['password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('requires a valid email format', function () {
        $this->postJson('/api/auth/login', [
            'email' => 'not-an-email',
            'password' => 'password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('requires a password', function () {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', ['email' => $user->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    });
});

// ─── Authenticated endpoints ──────────────────────────────────────────────────

describe('authenticated endpoints', function () {
    it('lets an authenticated user get their own profile', function () {
        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', $user->email)
            ->assertJsonPath('name', $user->name)
            ->assertJsonMissing(['password', 'remember_token']);
    });

    it('rejects an unauthenticated request', function () {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    });

    it('lets a user logout', function () {
        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonStructure(['message']);
    });

    it('lets a user refresh their token', function () {
        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $this->withToken($token)
            ->postJson('/api/auth/refresh')
            ->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in']);
    });
});

// ─── User model business rules ────────────────────────────────────────────────

describe('user model', function () {
    it('considers a verified user as email verified', function () {
        $user = User::factory()->create(['email_verified_at' => now()]);

        expect($user->isEmailVerified())->toBeTrue();
    });

    it('considers an unverified user as not email verified', function () {
        $user = User::factory()->unverified()->create();

        expect($user->isEmailVerified())->toBeFalse();
    });
});
