<?php

use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

describe('AuthService', function () {
    $service = app(AuthService::class);

    beforeEach(function () use (&$service) {
        $service = app(AuthService::class);
    });

    test('login returns authenticated user with valid credentials', function () use (&$service) {
        $user = User::factory()->create(['password' => Hash::make('secret123')]);

        $result = $service->login(['email' => $user->email, 'password' => 'secret123']);

        expect($result->id)->toBe($user->id);
    });

    test('login throws InvalidCredentialsException with wrong password', function () use (&$service) {
        $user = User::factory()->create(['password' => Hash::make('correct')]);

        expect(fn () => $service->login(['email' => $user->email, 'password' => 'wrong']))
            ->toThrow(InvalidCredentialsException::class);
    });

    test('login throws InvalidCredentialsException with unknown email', function () use (&$service) {
        expect(fn () => $service->login(['email' => 'nobody@example.com', 'password' => 'anything']))
            ->toThrow(InvalidCredentialsException::class);
    });

    test('register creates a new user in the database', function () use (&$service) {
        Event::fake([Registered::class]);

        $service->register([
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'password123',
        ]);

        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
    });

    test('register dispatches Registered event', function () use (&$service) {
        Event::fake([Registered::class]);

        $service->register([
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => 'password123',
        ]);

        Event::assertDispatched(Registered::class);
    });

    test('register returns the newly created user', function () use (&$service) {
        Event::fake([Registered::class]);

        $user = $service->register([
            'name' => 'Carol',
            'email' => 'carol@example.com',
            'password' => 'password123',
        ]);

        expect($user)->toBeInstanceOf(User::class)
            ->and($user->email)->toBe('carol@example.com');
    });

    test('register hashes the password', function () use (&$service) {
        Event::fake([Registered::class]);

        $service->register([
            'name' => 'Dave',
            'email' => 'dave@example.com',
            'password' => 'plaintext',
        ]);

        $stored = User::where('email', 'dave@example.com')->firstOrFail();
        $isHashed = Hash::check('plaintext', $stored->password);

        expect($isHashed)->toBeTrue();
    });

    test('updateProfile modifies authenticated user fields', function () use (&$service) {
        $user = User::factory()->create();
        $this->actingAs($user);

        $updated = $service->updateProfile(['name' => 'Updated Name', 'bio' => 'New bio']);

        expect($updated->name)->toBe('Updated Name')
            ->and($updated->bio)->toBe('New bio');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name']);
    });

    test('sendPasswordResetLink throws ValidationException for unknown email', function () use (&$service) {
        config(['app.key' => 'base64:'.base64_encode(random_bytes(32))]);

        expect(fn () => $service->sendPasswordResetLink('nobody@example.com'))
            ->toThrow(ValidationException::class);
    });
});
