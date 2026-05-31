<?php

declare(strict_types=1);

use App\Enums\AiSuggestionStatus;
use App\Http\Resources\VideoAiSuggestionResource;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

describe('VideoAiSuggestionResource', function () {
    test('toArray includes all expected fields', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $suggestion = VideoAiSuggestion::create([
            'video_id' => $video->id,
            'status' => AiSuggestionStatus::PENDING,
            'suggested_title' => 'AI Title',
            'suggested_description' => 'AI Description',
            'suggested_tags' => ['ai', 'ml'],
        ]);

        $resource = new VideoAiSuggestionResource($suggestion);
        $array = $resource->toArray(new Request);

        expect($array)->toHaveKey('status')
            ->and($array)->toHaveKey('suggested_title')
            ->and($array)->toHaveKey('suggested_description')
            ->and($array)->toHaveKey('suggested_tags')
            ->and($array['status'])->toBe(AiSuggestionStatus::PENDING->value)
            ->and($array['suggested_title'])->toBe('AI Title')
            ->and($array['suggested_description'])->toBe('AI Description')
            ->and($array['suggested_tags'])->toBe(['ai', 'ml']);
    });

    test('status is returned as string value', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $suggestion = VideoAiSuggestion::create([
            'video_id' => $video->id,
            'status' => AiSuggestionStatus::ACCEPTED,
            'suggested_tags' => [],
        ]);

        $resource = new VideoAiSuggestionResource($suggestion);
        $array = $resource->toArray(new Request);

        expect($array['status'])->toBe('accepted');
    });

    test('null fields are returned as null', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $suggestion = VideoAiSuggestion::create([
            'video_id' => $video->id,
            'status' => AiSuggestionStatus::DISMISSED,
            'suggested_tags' => [],
        ]);

        $resource = new VideoAiSuggestionResource($suggestion);
        $array = $resource->toArray(new Request);

        expect($array['suggested_title'])->toBeNull()
            ->and($array['suggested_description'])->toBeNull();
    });
});
