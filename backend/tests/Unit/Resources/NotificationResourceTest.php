<?php

use App\Http\Resources\NotificationResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function makeDbNotification(User $user, array $data = [], ?Carbon $readAt = null): DatabaseNotification
{
    return DatabaseNotification::create([
        'id' => (string) Str::uuid(),
        'type' => 'App\\Notifications\\TestNotification',
        'notifiable_id' => $user->id,
        'notifiable_type' => User::class,
        'data' => array_merge(['type' => 'video_liked'], $data),
        'read_at' => $readAt,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

describe('NotificationResource', function () {
    test('toArray includes expected keys', function () {
        $user = User::factory()->create();
        $notification = makeDbNotification($user);

        $array = (new NotificationResource($notification))->toArray(new Request);

        expect($array)->toHaveKeys(['id', 'type', 'data', 'read_at', 'created_at']);
    });

    test('type comes from the data type key', function () {
        $user = User::factory()->create();
        $notification = makeDbNotification($user, ['type' => 'new_subscriber']);

        $array = (new NotificationResource($notification))->toArray(new Request);

        expect($array['type'])->toBe('new_subscriber');
    });

    test('read_at is null when unread', function () {
        $user = User::factory()->create();
        $notification = makeDbNotification($user);

        $array = (new NotificationResource($notification))->toArray(new Request);

        expect($array['read_at'])->toBeNull();
    });

    test('read_at is ISO string when notification is read', function () {
        $user = User::factory()->create();
        $notification = makeDbNotification($user, [], Carbon::parse('2025-01-15 10:00:00+00:00'));

        $array = (new NotificationResource($notification))->toArray(new Request);

        expect($array['read_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });

    test('created_at is ISO string', function () {
        $user = User::factory()->create();
        $notification = makeDbNotification($user);

        $array = (new NotificationResource($notification))->toArray(new Request);

        expect($array['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
    });
});
