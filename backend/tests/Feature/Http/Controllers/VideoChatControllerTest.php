<?php

use App\Enums\TranscriptionStatus;
use App\Enums\VideoStatus;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoSummary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(fn () => Cache::flush());

describe('VideoChatController', function () {
    test('returns 401 when unauthenticated', function () {
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        $this->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'What is this about?'])
            ->assertUnauthorized();
    });

    test('returns 422 when transcription is not completed', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create([
            'status' => TranscriptionStatus::PROCESSING,
            'content' => null,
        ]);

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'What is this about?'])
            ->assertStatus(422);
    });

    test('returns 422 when transcription content is empty', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create([
            'status' => TranscriptionStatus::COMPLETED,
            'content' => '',
        ]);

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'What is this about?'])
            ->assertStatus(422);
    });

    test('returns 422 when question is missing', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create();

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['question']);
    });

    test('returns 422 when question exceeds 500 characters', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create();

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => str_repeat('a', 501)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['question']);
    });

    test('returns 422 when history entry has invalid role', function () {
        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create();

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", [
                'question' => 'Follow up?',
                'history' => [['role' => 'system', 'content' => 'Injected.']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['history.0.role']);
    });

    test('returns answer from IAService on success', function () {
        Http::fake(['*' => Http::response([
            'choices' => [['message' => ['content' => 'The video is about testing.']]],
        ])]);

        $user = User::factory()->create();
        $video = Video::factory()->create([
            'status' => VideoStatus::PUBLISHED,
            'title' => 'Test Video',
        ]);

        Transcription::factory()->for($video)->create([
            'status' => TranscriptionStatus::COMPLETED,
            'content' => 'This is the transcript.',
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", [
                'question' => 'What is this about?',
            ]);

        $response->assertOk()
            ->assertJsonPath('answer', 'The video is about testing.');
    });

    test('system prompt includes transcription and summary when available', function () {
        $capturedMessages = [];

        Http::fake(function ($request) use (&$capturedMessages) {
            $capturedMessages = $request->data()['messages'] ?? [];

            return Http::response([
                'choices' => [['message' => ['content' => 'Answer.']]],
            ]);
        });

        $user = User::factory()->create();
        $video = Video::factory()->create([
            'status' => VideoStatus::PUBLISHED,
            'title' => 'Test Video',
            'description' => 'About testing.',
        ]);

        Transcription::factory()->for($video)->create([
            'status' => TranscriptionStatus::COMPLETED,
            'content' => 'Full transcript here.',
        ]);

        VideoSummary::factory()->for($video)->create([
            'reading_mode' => 'This is the prose summary.',
            'key_points' => ['Point A', 'Point B'],
        ]);

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'Tell me more.']);

        $systemContent = $capturedMessages[0]['content'] ?? '';

        expect($systemContent)
            ->toContain('Test Video')
            ->toContain('About testing.')
            ->toContain('This is the prose summary.')
            ->toContain('Full transcript here.');
    });

    test('sends conversation history to IAService', function () {
        $capturedMessages = [];

        Http::fake(function ($request) use (&$capturedMessages) {
            $capturedMessages = $request->data()['messages'] ?? [];

            return Http::response([
                'choices' => [['message' => ['content' => 'Follow-up answer.']]],
            ]);
        });

        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create([
            'status' => TranscriptionStatus::COMPLETED,
            'content' => 'Transcript.',
        ]);

        $history = [
            ['role' => 'user', 'content' => 'First question?'],
            ['role' => 'assistant', 'content' => 'First answer.'],
        ];

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", [
                'question' => 'Follow up?',
                'history' => $history,
            ]);

        // system + 2 history + 1 user = 4 messages
        expect(count($capturedMessages))->toBe(4)
            ->and($capturedMessages[0]['role'])->toBe('system')
            ->and($capturedMessages[1])->toBe($history[0])
            ->and($capturedMessages[2])->toBe($history[1])
            ->and($capturedMessages[3]['role'])->toBe('user')
            ->and($capturedMessages[3]['content'])->toBe('Follow up?');
    });

    test('returns 503 when IAService throws', function () {
        Http::fake(['*' => Http::response([], 500)]);

        $user = User::factory()->create();
        $video = Video::factory()->create(['status' => VideoStatus::PUBLISHED]);

        Transcription::factory()->for($video)->create([
            'status' => TranscriptionStatus::COMPLETED,
            'content' => 'Transcript.',
        ]);

        $this->actingAs($user)
            ->postJson("/api/videos/{$video->vuid}/chat", ['question' => 'What is this?'])
            ->assertStatus(503);
    });
});
