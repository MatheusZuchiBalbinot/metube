<?php

declare(strict_types=1);

use App\Http\Requests\Comment\UpdateCommentRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdateCommentRequest', function () {
    test('authorize returns true', function () {
        expect((new UpdateCommentRequest)->authorize())->toBeTrue();
    });

    test('content is required', function () {
        $validator = Validator::make([], (new UpdateCommentRequest)->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('content'))->toBeTrue();
    });

    test('content cannot exceed 2000 characters', function () {
        $validator = Validator::make(
            ['content' => str_repeat('a', 2001)],
            (new UpdateCommentRequest)->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('content'))->toBeTrue();
    });

    test('valid content passes', function () {
        $validator = Validator::make(
            ['content' => 'Updated comment text'],
            (new UpdateCommentRequest)->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
