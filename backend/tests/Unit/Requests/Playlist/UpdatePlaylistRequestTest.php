<?php

use App\Http\Requests\Playlist\UpdatePlaylistRequest;
use Illuminate\Support\Facades\Validator;

describe('UpdatePlaylistRequest', function () {
    test('name is required', function () {
        $validator = Validator::make([], (new UpdatePlaylistRequest)->rules());

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('name cannot exceed 255 characters', function () {
        $validator = Validator::make(
            ['name' => str_repeat('a', 256)],
            (new UpdatePlaylistRequest)->rules()
        );

        expect($validator->fails())->toBeTrue()
            ->and($validator->errors()->has('name'))->toBeTrue();
    });

    test('valid name passes', function () {
        $validator = Validator::make(
            ['name' => 'Renamed Playlist'],
            (new UpdatePlaylistRequest)->rules()
        );

        expect($validator->fails())->toBeFalse();
    });
});
