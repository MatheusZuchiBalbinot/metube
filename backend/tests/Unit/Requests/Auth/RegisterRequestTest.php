<?php

declare(strict_types=1);

use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('RegisterRequest', function () {
    test('authorize returns true', function () {
        $request = new RegisterRequest;

        expect($request->authorize())->toBeTrue();
    });

    test('all fields are required', function () {
        $validator = Validator::make([], (new RegisterRequest)->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('name must be at least 2 characters', function () {
        $validator = Validator::make(
            ['name' => 'A', 'email' => 'a@b.com', 'password' => 'password123', 'password_confirmation' => 'password123'],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('name cannot exceed 60 characters', function () {
        $validator = Validator::make(
            ['name' => str_repeat('a', 61), 'email' => 'a@b.com', 'password' => 'password123', 'password_confirmation' => 'password123'],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('email must be unique', function () {
        User::factory()->create(['email' => 'taken@example.com']);

        $validator = Validator::make(
            ['name' => 'Alice', 'email' => 'taken@example.com', 'password' => 'password123', 'password_confirmation' => 'password123'],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });

    test('password must be at least 8 characters', function () {
        $validator = Validator::make(
            ['name' => 'Alice', 'email' => 'a@b.com', 'password' => 'short', 'password_confirmation' => 'short'],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('password must be confirmed', function () {
        $validator = Validator::make(
            ['name' => 'Alice', 'email' => 'a@b.com', 'password' => 'password123', 'password_confirmation' => 'different'],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('valid payload passes all rules', function () {
        $validator = Validator::make(
            ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'password123', 'password_confirmation' => 'password123'],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });

    test('password cannot exceed 128 characters', function () {
        $longPassword = str_repeat('a', 129);
        $validator = Validator::make(
            ['name' => 'Alice', 'email' => 'a@b.com', 'password' => $longPassword, 'password_confirmation' => $longPassword],
            (new RegisterRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });
});
