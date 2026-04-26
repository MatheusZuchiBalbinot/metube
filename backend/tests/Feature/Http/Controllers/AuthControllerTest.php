<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());


describe('AuthController', function () {
    test('login authenticates user', function () {
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['user']);
    });

    test('login fails with invalid credentials', function () {
        $user = User::factory()->create(['password' => bcrypt('password123')]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertUnauthorized();
    });

    test('me returns authenticated user', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/auth/me');

        $response->assertOk();
        $response->assertJsonPath('uuid', $user->uuid);
    });

    test('me fails without authentication', function () {
        $response = $this->getJson('/api/auth/me');

        $response->assertUnauthorized();
    });

    test('logout clears session', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/auth/logout');

        $response->assertOk();
    });

    test('update profile modifies user data', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patchJson('/api/auth/me', [
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
});
