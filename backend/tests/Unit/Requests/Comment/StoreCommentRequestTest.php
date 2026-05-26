<?php

use App\Http\Requests\Comment\StoreCommentRequest;
use Illuminate\Support\Facades\Validator;

describe('StoreCommentRequest', function () {
    test('authorize returns true', function () {
        expect((new StoreCommentRequest)->authorize())->toBeTrue();
    });

    test('content is required', function () {
        $validator = Validator::make([], (new StoreCommentRequest)->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('content'))->toBeTrue();
    });

    test('content cannot exceed 2000 characters', function () {
        $validator = Validator::make(
            ['content' => str_repeat('a', 2001)],
            (new StoreCommentRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('content'))->toBeTrue();
    });

    test('parent_cuid is optional', function () {
        $validator = Validator::make(
            ['content' => 'Valid comment'],
            (new StoreCommentRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });

    test('valid payload passes all rules', function () {
        $validator = Validator::make(
            ['content' => 'A valid comment', 'parent_cuid' => null],
            (new StoreCommentRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });
});
