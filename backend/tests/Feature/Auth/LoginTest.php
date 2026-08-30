<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Cache;

beforeEach(fn () => Cache::flush());

// ─── Login ────────────────────────────────────────────────────────────────────

describe('login', function () {
    it('allows a user to login with valid credentials', function () {
        $user = User::factory()->create();

        $this->postJson('/api/sessions', [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonStructure(['user'])
            ->assertJsonPath('user.email', $user->email);
    });

    it('fails with a wrong password', function () {
        $user = User::factory()->create();

        $this->postJson('/api/sessions', [
            'email' => $user->email,
            'password' => 'wrong_password',
        ])
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    });

    it('fails with a nonexistent email', function () {
        $this->postJson('/api/sessions', [
            'email' => 'nobody@example.com',
            'password' => 'password',
        ])->assertUnauthorized();
    });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validation', function () {
    it('requires an email', function () {
        $this->postJson('/api/sessions', ['password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('requires a valid email format', function () {
        $this->postJson('/api/sessions', [
            'email' => 'not-an-email',
            'password' => 'password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('requires a password', function () {
        $user = User::factory()->create();

        $this->postJson('/api/sessions', ['email' => $user->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    });
});

// ─── Authenticated endpoints ──────────────────────────────────────────────────

describe('authenticated endpoints', function () {
    it('lets an authenticated user get their own profile', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/sessions/current')
            ->assertOk()
            ->assertJsonPath('email', $user->email)
            ->assertJsonPath('name', $user->name)
            ->assertJsonMissing(['password', 'remember_token']);
    });

    it('rejects an unauthenticated request', function () {
        $this->getJson('/api/sessions/current')->assertUnauthorized();
    });

    it('lets a user logout', function () {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->deleteJson('/api/sessions/current')
            ->assertOk()
            ->assertJsonStructure(['message']);
    });
});

// ─── Session version invalidation ────────────────────────────────────────────

describe('session version', function () {
    it('rejects requests after session_version is incremented', function () {
        $user = User::factory()->create();

        // Stateful request: Origin header makes Sanctum start the session middleware
        $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost'])
            ->withSession(['session_version' => $user->session_version])
            ->getJson('/api/sessions/current')
            ->assertOk();

        // Invalidate all sessions by bumping session_version to 2
        $user->increment('session_version');
        $user->refresh();

        // Old session (still has version 1) should now be rejected
        $this->actingAs($user)
            ->withHeaders(['Origin' => 'http://localhost'])
            ->withSession(['session_version' => 1])
            ->getJson('/api/sessions/current')
            ->assertUnauthorized();
    });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('rate limiting', function () {
    it('returns 429 after too many login attempts', function () {
        $user = User::factory()->create();
        $serverVars = ['REMOTE_ADDR' => '10.0.0.1'];

        foreach (range(1, 5) as $_) {
            $this->withServerVariables($serverVars)
                ->postJson('/api/sessions', [
                    'email' => $user->email,
                    'password' => 'wrong',
                ])->assertUnauthorized();
        }

        $this->withServerVariables($serverVars)
            ->postJson('/api/sessions', [
                'email' => $user->email,
                'password' => 'wrong',
            ])->assertStatus(429);
    });
});
