<?php

use App\Models\User;
use App\Models\Video;
use App\Models\VideoProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('UserController', function () {
    test('progress returns empty map when user has no progress', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/users/me/progress');

        $response->assertOk();
        $response->assertJson(['data' => []]);
    });

    test('progress returns vuid to percent map for all started videos', function () {
        $user = User::factory()->create();
        $videoA = Video::factory()->create();
        $videoB = Video::factory()->create();

        VideoProgress::factory()->create([
            'user_id' => $user->id,
            'video_id' => $videoA->id,
            'percent' => 45,
        ]);
        VideoProgress::factory()->create([
            'user_id' => $user->id,
            'video_id' => $videoB->id,
            'percent' => 100,
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/progress');

        $response->assertOk();
        $response->assertJson([
            'data' => [
                $videoA->vuid => 45,
                $videoB->vuid => 100,
            ],
        ]);
    });

    test('progress does not return progress from other users', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $video = Video::factory()->create();

        VideoProgress::factory()->create([
            'user_id' => $other->id,
            'video_id' => $video->id,
            'percent' => 70,
        ]);

        $response = $this->actingAs($user)->getJson('/api/users/me/progress');

        $response->assertOk();
        $response->assertJson(['data' => []]);
    });
});
