<?php

declare(strict_types=1);

use App\Models\Video;
use App\Models\VideoSummary;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoSummary Model', function () {
    test('summary belongs to a video', function () {
        $video = Video::factory()->create();
        $summary = VideoSummary::factory()->for($video)->create();

        expect($summary->video_id)->toBe($video->id);
        expect($summary->video->id)->toBe($video->id);
    });

    test('key_points is cast to array', function () {
        $video = Video::factory()->create();
        $keyPoints = ['Point one', 'Point two', 'Point three'];
        $summary = VideoSummary::factory()->for($video)->create(['key_points' => $keyPoints]);

        expect($summary->key_points)->toBeArray();
        expect($summary->key_points)->toEqual($keyPoints);
    });

    test('chapters is cast to array', function () {
        $video = Video::factory()->create();
        $chapters = [
            ['timestamp' => '00:00', 'title' => 'Introduction'],
            ['timestamp' => '05:30', 'title' => 'Main Content'],
        ];
        $summary = VideoSummary::factory()->for($video)->create(['chapters' => $chapters]);

        expect($summary->chapters)->toBeArray();
        expect($summary->chapters)->toHaveCount(2);
        expect($summary->chapters[0]['title'])->toBe('Introduction');
    });

    test('reading_mode can be stored and retrieved', function () {
        $video = Video::factory()->create();
        $summary = VideoSummary::factory()->for($video)->create(['reading_mode' => 'detailed']);

        expect($summary->reading_mode)->toBe('detailed');
    });

    test('video has one summary', function () {
        $video = Video::factory()->create();
        $summary = VideoSummary::factory()->for($video)->create();

        expect($video->summary->id)->toBe($summary->id);
    });
});
