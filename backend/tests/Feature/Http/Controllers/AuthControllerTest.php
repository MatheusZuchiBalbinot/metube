<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

describe('AuthController', function () {
    test('login authenticates user', function () {
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        $response = $this->postJson('/api/sessions', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['user']);
    });

    test('login fails with invalid credentials', function () {
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        $response = $this->postJson('/api/sessions', [
            'email' => $user->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertUnauthorized();
    });

    test('current session returns authenticated user', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/sessions/current');

        $response->assertOk();
        $response->assertJsonPath('uuid', $user->uuid);
    });

    test('current session fails without authentication', function () {
        $response = $this->getJson('/api/sessions/current');

        $response->assertUnauthorized();
    });

    test('logout clears session', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->deleteJson('/api/sessions/current');

        $response->assertOk();
    });

    test('update profile modifies user data', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patchJson("/api/users/{$user->uuid}", [
            'name' => 'New Name',
            'bio' => 'New Bio',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'bio' => 'New Bio',
        ]);
    });

    test('update profile rejects other users', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $response = $this->actingAs($user)->patchJson("/api/users/{$other->uuid}", [
            'name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });

    test('register creates user and returns 201', function () {
        $response = $this->postJson('/api/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['user']);
        $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
    });

    test('register fails with duplicate email', function () {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/users', [
            'name' => 'Another',
            'email' => 'taken@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    });

    test('register fails with mismatched password confirmation', function () {
        $response = $this->postJson('/api/users', [
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['password']);
    });

    test('forgot password fails with unknown email', function () {
        config(['app.key' => 'base64:'.base64_encode(random_bytes(32))]);

        $response = $this->postJson('/api/password-resets', [
            'email' => 'nobody@example.com',
        ]);

        $response->assertUnprocessable();
    });

    test('forgot password requires valid email format', function () {
        $response = $this->postJson('/api/password-resets', [
            'email' => 'not-an-email',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    });

    test('resend verification requires authentication', function () {
        $response = $this->postJson('/api/email-verifications');

        $response->assertUnauthorized();
    });
});
