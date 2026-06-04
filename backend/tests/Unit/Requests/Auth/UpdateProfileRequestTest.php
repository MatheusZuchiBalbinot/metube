<?php

declare(strict_types=1);

use App\Http\Requests\Auth\UpdateProfileRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdateProfileRequest', function () {
    test('all fields are optional', function () {
        $validator = Validator::make([], (new UpdateProfileRequest())->rules());
        expect($validator->fails())->toBeFalse();
    });

    test('name cannot exceed 255 characters', function () {
        $validator = Validator::make(
            ['name' => str_repeat('a', 256)],
            (new UpdateProfileRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('bio cannot exceed 1000 characters', function () {
        $validator = Validator::make(
            ['bio' => str_repeat('a', 1001)],
            (new UpdateProfileRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('bio'))->toBeTrue();
    });

    test('valid name and bio passes', function () {
        $validator = Validator::make(
            ['name' => 'Alice', 'bio' => 'I make videos'],
            (new UpdateProfileRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
