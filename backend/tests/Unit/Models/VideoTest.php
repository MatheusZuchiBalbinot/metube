<?php

use App\Enums\VideoStatus;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Video Model', function () {
    test('video is created with auto-generated vuid', function () {
        $video = Video::factory()->create();

        expect($video->vuid)->not->toBeNull();
        expect(strlen($video->vuid))->toBeGreaterThan(0);
    });

    test('video belongs to a channel (user)', function () {
        $user = \App\Models\User::factory()->create();
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
        $published->each(fn ($video) => expect($video->status)->toBe(VideoStatus::PUBLISHED->value));
    });

    test('scope filter searches by title', function () {
        $faker = \Faker\Factory::create();
        $searchTerm = $faker->word();
        $matchingTitle = "$searchTerm Tutorial";
        $nonMatchingTitle = $faker->sentence();

        Video::factory()->create(['title' => $matchingTitle]);
        Video::factory(rand(2, 4))->create(['title' => $nonMatchingTitle]);

        $filtered = Video::filter(['search' => $searchTerm])->get();

        expect($filtered)->toHaveCount(1);
        expect($filtered[0]->title)->toContain($searchTerm);
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
});
