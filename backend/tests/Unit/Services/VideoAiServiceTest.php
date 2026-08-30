<?php

declare(strict_types=1);

use App\DTOs\VideoSummaryDTO;
use App\Enums\AiSuggestionStatus;
use App\Enums\TranscriptionLimit;
use App\Models\Video;
use App\Services\VideoAiService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

describe('VideoAiService::getSummary', function () {
    test('returns an empty summary when the video has no summary yet', function () {
        $video = Video::factory()->create();

        $summary = app(VideoAiService::class)->getSummary($video);

        expect($summary)->toBeInstanceOf(VideoSummaryDTO::class)
            ->and($summary->keyPoints)->toBe([])
            ->and($summary->chapters)->toBe([])
            ->and($summary->readingMode)->toBe('');
    });

    test('returns the summary built from the video model when present', function () {
        $video = Video::factory()->create();
        $video->summary()->create([
            'key_points' => ['Point A', 'Point B'],
            'chapters' => [['timestamp' => '0:00', 'title' => 'Intro']],
            'reading_mode' => 'Full summary text',
        ]);
        $video->unsetRelation('summary');

        $summary = app(VideoAiService::class)->getSummary($video);

        // toEqual() (== semantics) is used for chapters instead of toBe() (===)
        // because associative-array key order in the JSON round-trip through
        // the DB is not a meaningful part of the contract and isn't guaranteed
        // stable across PHP versions/environments.
        expect($summary->keyPoints)->toBe(['Point A', 'Point B'])
            ->and($summary->chapters)->toEqual([['timestamp' => '0:00', 'title' => 'Intro']])
            ->and($summary->readingMode)->toBe('Full summary text');
    });
});

describe('VideoAiService::acceptAiSuggestion', function () {
    test('applies the suggested title, description and tags to the video', function () {
        $video = Video::factory()->create([
            'title' => 'Old Title',
            'description' => 'Old description',
            'tags' => ['old'],
        ]);
        $video->aiSuggestion()->create([
            'suggested_title' => 'New Title',
            'suggested_description' => 'New description',
            'suggested_tags' => ['new', 'tags'],
            'status' => AiSuggestionStatus::PENDING,
        ]);

        app(VideoAiService::class)->acceptAiSuggestion($video);

        $video->refresh();
        expect($video->title)->toBe('New Title')
            ->and($video->description)->toBe('New description')
            ->and($video->tags)->toBe(['new', 'tags']);

        $suggestion = $video->aiSuggestion()->first();
        expect($suggestion->status)->toBe(AiSuggestionStatus::ACCEPTED);
    });

    test('falls back to existing video fields when suggested fields are empty', function () {
        $video = Video::factory()->create([
            'title' => 'Keep Title',
            'description' => 'Keep description',
            'tags' => ['keep'],
        ]);
        $video->aiSuggestion()->create([
            'suggested_title' => null,
            'suggested_description' => null,
            'suggested_tags' => [],
            'status' => AiSuggestionStatus::PENDING,
        ]);

        app(VideoAiService::class)->acceptAiSuggestion($video);

        $video->refresh();
        expect($video->title)->toBe('Keep Title')
            ->and($video->description)->toBe('Keep description')
            ->and($video->tags)->toBe(['keep']);
    });

    test('throws ModelNotFoundException when the video has no suggestion', function () {
        $video = Video::factory()->create();

        expect(fn () => app(VideoAiService::class)->acceptAiSuggestion($video))
            ->toThrow(ModelNotFoundException::class);
    });
});

describe('VideoAiService::dismissAiSuggestion', function () {
    test('marks the pending suggestion as dismissed', function () {
        $video = Video::factory()->create();
        $video->aiSuggestion()->create([
            'suggested_title' => 'Ignored Title',
            'suggested_description' => null,
            'suggested_tags' => [],
            'status' => AiSuggestionStatus::PENDING,
        ]);

        app(VideoAiService::class)->dismissAiSuggestion($video);

        $suggestion = $video->aiSuggestion()->first();
        expect($suggestion->status)->toBe(AiSuggestionStatus::DISMISSED);
    });

    test('throws ModelNotFoundException when the video has no suggestion', function () {
        $video = Video::factory()->create();

        expect(fn () => app(VideoAiService::class)->dismissAiSuggestion($video))
            ->toThrow(ModelNotFoundException::class);
    });
});

describe('VideoAiService::buildVideoSystemPrompt', function () {
    test('includes title, description, summary and transcription content', function () {
        $video = Video::factory()->create([
            'title' => 'My Video Title',
            'description' => 'My video description',
        ]);
        $video->summary()->create([
            'key_points' => ['First point', 'Second point'],
            'chapters' => [],
            'reading_mode' => 'A concise summary',
        ]);
        $video->unsetRelation('summary');
        $video->refresh();

        $prompt = app(VideoAiService::class)->buildVideoSystemPrompt($video, 'Full transcription text here.');

        expect($prompt)
            ->toContain('My Video Title')
            ->toContain('My video description')
            ->toContain('A concise summary')
            ->toContain('First point')
            ->toContain('Second point')
            ->toContain('Full transcription text here.');
    });

    test('omits the description section when the video has no description', function () {
        $video = Video::factory()->create(['description' => '']);

        $prompt = app(VideoAiService::class)->buildVideoSystemPrompt($video, 'Transcript');

        expect($prompt)->not->toContain('VIDEO DESCRIPTION');
    });

    test('truncates the transcription to the configured character limit', function () {
        $video = Video::factory()->create();
        $longTranscription = str_repeat('a', 10_000);

        $prompt = app(VideoAiService::class)->buildVideoSystemPrompt($video, $longTranscription);

        $transcriptionSection = mb_substr($prompt, (int) mb_strpos($prompt, 'FULL TRANSCRIPTION:'));
        $transcriptionOnly = str_replace("FULL TRANSCRIPTION:\n", '', $transcriptionSection);

        expect(mb_strlen($transcriptionOnly))->toBe(TranscriptionLimit::MAX_CHARS_FOR_CHAT->value);
    });
});
