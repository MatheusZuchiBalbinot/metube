<?php

declare(strict_types=1);

use App\Enums\VideoStatus;
use App\Models\User;
use App\Models\Video;
use App\Policies\VideoPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoPolicy', function () {
    test('view allows owner to see draft video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::DRAFT]);
        $policy = new VideoPolicy();

        $result = $policy->view($owner, $video);

        expect($result)->toBeTrue();
    });

    test('view allows owner to see any status video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::PROCESSING]);
        $policy = new VideoPolicy();

        $result = $policy->view($owner, $video);

        expect($result)->toBeTrue();
    });

    test('view allows non-owner to see published video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::PUBLISHED]);
        $policy = new VideoPolicy();

        $result = $policy->view($other, $video);

        expect($result)->toBeTrue();
    });

    test('view denies non-owner from seeing draft video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::DRAFT]);
        $policy = new VideoPolicy();

        $result = $policy->view($other, $video);

        expect($result)->toBeFalse();
    });

    test('view denies non-owner from seeing processing video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create(['status' => VideoStatus::PROCESSING]);
        $policy = new VideoPolicy();

        $result = $policy->view($other, $video);

        expect($result)->toBeFalse();
    });

    test('update allows owner to update video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $policy = new VideoPolicy();

        $result = $policy->update($owner, $video);

        expect($result)->toBeTrue();
    });

    test('update denies non-owner from updating video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $policy = new VideoPolicy();

        $result = $policy->update($other, $video);

        expect($result)->toBeFalse();
    });

    test('delete allows owner to delete video', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $policy = new VideoPolicy();

        $result = $policy->delete($owner, $video);

        expect($result)->toBeTrue();
    });

    test('delete denies non-owner from deleting video', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $policy = new VideoPolicy();

        $result = $policy->delete($other, $video);

        expect($result)->toBeFalse();
    });

    test('create allows any authenticated user', function () {
        $user = User::factory()->create();
        $policy = new VideoPolicy();

        $result = $policy->create($user);

        expect($result)->toBeTrue();
    });

    test('retryTranscription allows owner', function () {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $policy = new VideoPolicy();

        $result = $policy->retryTranscription($owner, $video);

        expect($result)->toBeTrue();
    });

    test('retryTranscription denies non-owner', function () {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->for($owner, 'channel')->create();
        $policy = new VideoPolicy();

        $result = $policy->retryTranscription($other, $video);

        expect($result)->toBeFalse();
    });
});
