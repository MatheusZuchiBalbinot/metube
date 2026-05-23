<?php

use App\Enums\TranscriptionStatus;
use App\Models\Transcription;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Transcription Model', function () {
    test('transcription belongs to a video', function () {
        $video = Video::factory()->create();
        $transcription = Transcription::factory()->for($video)->create();

        expect($transcription->video_id)->toBe($video->id);
        expect($transcription->video->id)->toBe($video->id);
    });

    test('status is cast to TranscriptionStatus enum', function () {
        $video = Video::factory()->create();
        $transcription = Transcription::factory()->for($video)->create(['status' => TranscriptionStatus::PENDING]);

        expect($transcription->status)->toBe(TranscriptionStatus::PENDING);
    });

    test('started_at is cast to datetime', function () {
        $video = Video::factory()->create();
        $now = now();
        $transcription = Transcription::factory()->for($video)->create(['started_at' => $now]);

        expect($transcription->started_at)->not->toBeNull();
        expect($transcription->started_at->toDateString())->toBe($now->toDateString());
    });

    test('transcription has expected fillable fields', function () {
        $transcription = new Transcription;
        $fillable = $transcription->getFillable();

        expect($fillable)->toContain('video_id');
        expect($fillable)->toContain('language');
        expect($fillable)->toContain('content');
        expect($fillable)->toContain('status');
        expect($fillable)->toContain('started_at');
    });

    test('video has one transcription', function () {
        $video = Video::factory()->create();
        $transcription = Transcription::factory()->for($video)->create();

        expect($video->transcription->id)->toBe($transcription->id);
    });

    test('started_at can be null', function () {
        $video = Video::factory()->create();
        $transcription = Transcription::factory()->for($video)->create(['started_at' => null]);

        expect($transcription->started_at)->toBeNull();
    });
});
