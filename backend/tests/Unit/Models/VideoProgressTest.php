<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Video;
use App\Models\VideoProgress;

describe('VideoProgress Model', function () {
    test('progress belongs to a user', function () {
        $user = User::factory()->create();
        $progress = VideoProgress::factory()->for($user)->create();

        expect($progress->user_id)->toBe($user->id);
        expect($progress->user->id)->toBe($user->id);
    });

    test('progress belongs to a video', function () {
        $video = Video::factory()->create();
        $progress = VideoProgress::factory()->for($video)->create();

        expect($progress->video_id)->toBe($video->id);
        expect($progress->video->id)->toBe($video->id);
    });

    test('percent is cast to integer', function () {
        $progress = VideoProgress::factory()->create(['percent' => 75]);

        expect($progress->percent)->toBe(75);
    });

    test('percent can be 0', function () {
        $progress = VideoProgress::factory()->create(['percent' => 0]);

        expect($progress->percent)->toBe(0);
    });

    test('percent can be 100', function () {
        $progress = VideoProgress::factory()->create(['percent' => 100]);

        expect($progress->percent)->toBe(100);
    });

    test('progress has expected fillable fields', function () {
        $progress = new VideoProgress();
        $fillable = $progress->getFillable();

        expect($fillable)->toContain('user_id');
        expect($fillable)->toContain('video_id');
        expect($fillable)->toContain('percent');
    });
});
