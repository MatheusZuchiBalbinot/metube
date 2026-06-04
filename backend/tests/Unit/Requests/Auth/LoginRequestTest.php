<?php

declare(strict_types=1);

use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Support\Facades\Validator;

describe('LoginRequest', function () {
    test('authorize returns true', function () {
        expect((new LoginRequest())->authorize())->toBeTrue();
    });

    test('email is required', function () {
        $validator = Validator::make(
            ['password' => 'secret'],
            (new LoginRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });

    test('email must be a valid email address', function () {
        $validator = Validator::make(
            ['email' => 'not-an-email', 'password' => 'secret'],
            (new LoginRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });

    test('password is required', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com'],
            (new LoginRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('password'))->toBeTrue();
    });

    test('valid credentials payload passes', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com', 'password' => 'secret123'],
            (new LoginRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
