<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware(['web', 'auth:sanctum', 'session.version'])
        ->get('/_test/session-version', fn () => response()->json(['ok' => true]));
});

describe('CheckSessionVersion', function () {
    test('allows unauthenticated requests to pass through', function () {
        $this->getJson('/_test/session-version')
            ->assertStatus(401);
    });

    test('allows authenticated request when session_version matches', function () {
        $user = User::factory()->create(['session_version' => 1]);

        $this->actingAs($user)
            ->withSession(['session_version' => 1])
            ->getJson('/_test/session-version')
            ->assertOk()
            ->assertJson(['ok' => true]);
    });

    test('returns 401 when session_version is mismatched', function () {
        $user = User::factory()->create(['session_version' => 2]);

        $this->actingAs($user)
            ->withSession(['session_version' => 1])
            ->getJson('/_test/session-version')
            ->assertStatus(401);
    });

    test('allows request when no session_version in session', function () {
        $user = User::factory()->create(['session_version' => 1]);

        $this->actingAs($user)
            ->getJson('/_test/session-version')
            ->assertOk();
    });
});
