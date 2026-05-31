<?php

declare(strict_types=1);

use App\AI\Prompts\VideoMetadataPrompt;
use App\DTOs\VideoMetadataResult;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('VideoMetadataPrompt', function () {
    test('buildRequest returns valid Gemini request structure', function () {
        $video = new Video([
            'title' => 'Test Video',
            'description' => 'Test description',
        ]);
        $video->transcription = (object) [
            'content' => 'Full transcription text',
            'language' => 'pt',
        ];

        $prompt = new VideoMetadataPrompt($video);
        $request = $prompt->buildRequest();

        expect($request)
            ->toHaveKey('contents')
            ->toHaveKey('generationConfig')
            ->toHaveKey('generationConfig.responseMimeType', 'application/json');

        expect($request['contents'][0]['parts'][0]['text'])
            ->toContain('Test Video')
            ->toContain('Full transcription text')
            ->toContain('language code: pt');
    });

    test('parse returns VideoMetadataResult from valid response', function () {
        $video = new Video(['vuid' => 'test-vuid']);

        $response = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => json_encode([
                                    'key_points' => ['Point 1', 'Point 2'],
                                    'chapters' => [['timestamp' => '00:01:00', 'title' => 'Intro']],
                                    'reading_mode' => 'Summary text here.',
                                    'suggested_tags' => ['tag1', 'tag2'],
                                    'suggested_title' => 'New Title',
                                    'suggested_description' => 'New description',
                                ]),
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $prompt = new VideoMetadataPrompt($video);
        $result = $prompt->parse($response);

        expect($result)->toBeInstanceOf(VideoMetadataResult::class);
        expect($result->keyPoints)->toBe(['Point 1', 'Point 2']);
        expect($result->suggestedTitle)->toBe('New Title');
    });

    test('parse throws exception if response missing content', function () {
        $video = new Video(['vuid' => 'test-vuid']);
        $response = ['candidates' => [[]]];

        $prompt = new VideoMetadataPrompt($video);

        expect(fn () => $prompt->parse($response))
            ->toThrow(RuntimeException::class, 'missing content');
    });

    test('parse throws exception if JSON is invalid', function () {
        $video = new Video(['vuid' => 'test-vuid']);
        $response = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [['text' => 'not valid json']],
                    ],
                ],
            ],
        ];

        $prompt = new VideoMetadataPrompt($video);

        expect(fn () => $prompt->parse($response))
            ->toThrow(RuntimeException::class, 'invalid JSON');
    });

    test('parse throws exception if required key is missing', function () {
        $video = new Video(['vuid' => 'test-vuid']);
        $response = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => json_encode([
                                    'key_points' => ['Point 1'],
                                    // missing other required keys
                                ]),
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $prompt = new VideoMetadataPrompt($video);

        expect(fn () => $prompt->parse($response))
            ->toThrow(RuntimeException::class, 'missing required key');
    });
});
