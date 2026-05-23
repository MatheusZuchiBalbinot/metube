<?php

use App\Enums\VideoStatus;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoProgress;
use App\Models\VideoSummary;
use App\Models\WatchHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

describe('Video Model', function () {
    test('video is created with auto-generated vuid', function () {
        $video = Video::factory()->create();

        expect($video->vuid)->not->toBeNull();
        expect(strlen($video->vuid))->toBeGreaterThan(0);
    });

    test('video belongs to a channel (user)', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();

        expect($video->channel_id)->toBe($user->id);
        expect($video->channel->id)->toBe($user->id);
    });

    test('scope published filters only published videos', function () {
        $publishedCount = rand(2, 5);
        $otherCount = rand(3, 7);

        Video::factory($publishedCount)->create(['status' => VideoStatus::PUBLISHED->value]);
        Video::factory($otherCount)->create(['status' => VideoStatus::DRAFT->value]);
        Video::factory($otherCount)->create(['status' => VideoStatus::SCHEDULED->value]);

        $published = Video::published()->get();

        expect($published)->toHaveCount($publishedCount);
        $published->each(fn ($video) => expect($video->status)->toBe(VideoStatus::PUBLISHED));
    });

    test('scope newestPublished orders by published_at descending', function () {
        $user = User::factory()->create();
        $older = Video::factory()->for($user, 'channel')->create([
            'status' => VideoStatus::PUBLISHED,
            'published_at' => Carbon::now()->subDays(5),
        ]);
        $newer = Video::factory()->for($user, 'channel')->create([
            'status' => VideoStatus::PUBLISHED,
            'published_at' => Carbon::now()->subDay(),
        ]);

        $results = Video::published()->newestPublished()->get();

        expect($results->first()->id)->toBe($newer->id)
            ->and($results->last()->id)->toBe($older->id);
    });

    test('scope filter searches by title', function () {
        $searchTerm = 'xyzuniquetermnever';
        $matchingTitle = "$searchTerm Tutorial";
        $nonMatchingTitle = 'Some random video about things';

        Video::factory()->create(['title' => $matchingTitle, 'description' => 'No match here', 'tags' => ['random', 'tags']]);
        Video::factory(rand(2, 4))->create(['title' => $nonMatchingTitle, 'description' => 'Different content', 'tags' => ['other', 'labels']]);

        $filtered = Video::filter(['search' => $searchTerm])->get();

        expect($filtered)->toHaveCount(1);
        expect($filtered[0]->title)->toContain($searchTerm);
    });

    test('scope filter searches by description', function () {
        Video::factory()->create(['title' => 'Unrelated', 'description' => 'unique_desc_term_xyz']);
        Video::factory()->create(['title' => 'Other', 'description' => 'something else entirely']);

        $filtered = Video::filter(['search' => 'unique_desc_term_xyz'])->get();

        expect($filtered)->toHaveCount(1);
    });

    test('scope filter filters by tags', function () {
        Video::factory()->create(['tags' => ['php', 'laravel']]);
        Video::factory()->create(['tags' => ['javascript', 'react']]);

        $filtered = Video::filter(['tags' => ['php']])->get();

        expect($filtered)->toHaveCount(1)
            ->and($filtered->first()->tags)->toContain('php');
    });

    test('scope filter filters by status', function () {
        Video::factory()->create(['status' => VideoStatus::PUBLISHED]);
        Video::factory()->create(['status' => VideoStatus::DRAFT]);

        $filtered = Video::filter(['status' => VideoStatus::PUBLISHED->value])->get();

        expect($filtered)->toHaveCount(1)
            ->and($filtered->first()->status)->toBe(VideoStatus::PUBLISHED);
    });

    test('video can have tags as array', function () {
        $faker = \Faker\Factory::create();
        $tagsCount = rand(1, 8);
        $tags = array_slice($faker->words($tagsCount), 0, $tagsCount);

        $video = Video::factory()->create(['tags' => $tags]);

        expect($video->tags)->toBeArray();
        expect($video->tags)->toHaveCount($tagsCount);
        expect($video->tags)->toEqual($tags);
    });

    test('video has summary relation', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        VideoSummary::factory()->for($video)->create();

        $video->load('summary');

        expect($video->summary)->toBeInstanceOf(VideoSummary::class);
    });

    test('video has transcription relation', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        Transcription::factory()->for($video)->create();

        $video->load('transcription');

        expect($video->transcription)->toBeInstanceOf(Transcription::class);
    });

    test('video has aiSuggestion relation', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        VideoAiSuggestion::create([
            'video_id' => $video->id,
            'status' => \App\Enums\AiSuggestionStatus::PENDING,
            'suggested_tags' => [],
        ]);

        $video->load('aiSuggestion');

        expect($video->aiSuggestion)->toBeInstanceOf(VideoAiSuggestion::class);
    });

    test('video has progress relation', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        VideoProgress::factory()->for($user)->for($video)->create(['percent' => 50]);

        $video->load('progress');

        expect($video->progress)->toHaveCount(1);
    });

    test('video has watchHistory relation', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create();
        $now = Carbon::now();
        WatchHistory::create([
            'user_id' => $user->id,
            'video_id' => $video->id,
            'watched_at' => $now,
            'watched_hour' => $now->format('Y-m-d H:00:00'),
        ]);

        $video->load('watchHistory');

        expect($video->watchHistory)->toHaveCount(1);
    });

    test('vuid is 11 characters long', function () {
        $video = Video::factory()->create();

        expect(strlen($video->vuid))->toBe(11);
    });

    test('is_batch is false when explicitly set to false', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => false]);

        expect($video->is_batch)->toBeFalse();
    });

    test('is_batch is true when explicitly set to true', function () {
        $user = User::factory()->create();
        $video = Video::factory()->for($user, 'channel')->create(['is_batch' => true]);

        expect($video->is_batch)->toBeTrue();
    });
});
