<?php

declare(strict_types=1);

use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Support\Facades\Validator;

describe('ResetPasswordRequest', function () {
    test('authorize returns true', function () {
        $request = new ResetPasswordRequest;

        expect($request->authorize())->toBeTrue();
    });

    test('email is required', function () {
        $validator = Validator::make(
            ['password' => 'password123', 'password_confirmation' => 'password123'],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });

    test('password is required', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com'],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('password must be at least 8 characters', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com', 'password' => 'short', 'password_confirmation' => 'short'],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('password must be confirmed', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com', 'password' => 'password123', 'password_confirmation' => 'different'],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('password cannot exceed 128 characters', function () {
        $longPassword = str_repeat('a', 129);
        $validator = Validator::make(
            ['email' => 'user@example.com', 'password' => $longPassword, 'password_confirmation' => $longPassword],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('valid payload passes all rules', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com', 'password' => 'securepass123', 'password_confirmation' => 'securepass123'],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });

    test('email must be valid format', function () {
        $validator = Validator::make(
            ['email' => 'not-an-email', 'password' => 'securepass123', 'password_confirmation' => 'securepass123'],
            (new ResetPasswordRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });
});
