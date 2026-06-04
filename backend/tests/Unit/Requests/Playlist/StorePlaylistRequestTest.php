<?php

declare(strict_types=1);

use App\Http\Requests\Playlist\StorePlaylistRequest;
use Illuminate\Support\Facades\Validator;

describe('StorePlaylistRequest', function () {
    test('name is required', function () {
        $validator = Validator::make([], (new StorePlaylistRequest())->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('name cannot exceed 255 characters', function () {
        $validator = Validator::make(
            ['name' => str_repeat('a', 256)],
            (new StorePlaylistRequest())->rules(),
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('valid name passes', function () {
        $validator = Validator::make(
            ['name' => 'My Playlist'],
            (new StorePlaylistRequest())->rules(),
        );

        expect($validator->fails())->toBeFalse();
    });
});
