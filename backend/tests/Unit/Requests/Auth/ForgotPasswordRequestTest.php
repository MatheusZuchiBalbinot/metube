<?php

use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

describe('ForgotPasswordRequest', function () {
    test('authorize returns true', function () {
        $request = new ForgotPasswordRequest;

        expect($request->authorize())->toBeTrue();
    });

    test('email is required', function () {
        $validator = Validator::make([], (new ForgotPasswordRequest)->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });

    test('email must be valid format', function () {
        $validator = Validator::make(
            ['email' => 'not-an-email'],
            (new ForgotPasswordRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('email'))->toBeTrue();
    });

    test('valid email passes validation', function () {
        $validator = Validator::make(
            ['email' => 'user@example.com'],
            (new ForgotPasswordRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });

    test('rules returns email rule', function () {
        $rules = (new ForgotPasswordRequest)->rules();

        expect($rules)->toHaveKey('email')
            ->and($rules['email'])->toContain('email')
            ->and($rules['email'])->toContain('required');
    });
});
