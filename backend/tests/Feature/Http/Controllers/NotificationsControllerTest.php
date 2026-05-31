<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function createNotificationFor(User $user, bool $read = false): DatabaseNotification
{
    $notif = DatabaseNotification::create([
        'id' => (string) Str::uuid(),
        'type' => App\Notifications\VideoFromSubscriptionNotification::class,
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => ['type' => 'video_from_subscription', 'vuid' => 'abc', 'video_title' => 'Test', 'channel_name' => 'Chan'],
        'read_at' => $read ? now() : null,
    ]);

    return $notif;
}

describe('NotificationsController', function () {
    test('index returns paginated notifications for authenticated user', function () {
        $user = User::factory()->create();
        createNotificationFor($user);
        createNotificationFor($user);

        $response = $this->actingAs($user)->getJson('/api/notifications');

        $response->assertOk();
        $response->assertJsonStructure(['data']);
        expect(count($response->json('data')))->toBe(2);
    });

    test('index returns 401 for guest', function () {
        $response = $this->getJson('/api/notifications');

        $response->assertUnauthorized();
    });

    test('unreadCount returns count of unread notifications', function () {
        $user = User::factory()->create();
        createNotificationFor($user, read: false);
        createNotificationFor($user, read: true);

        $response = $this->actingAs($user)->getJson('/api/notifications/unread-count');

        $response->assertOk();
        $response->assertJsonPath('count', 1);
    });

    test('unreadCount returns 401 for guest', function () {
        $response = $this->getJson('/api/notifications/unread-count');

        $response->assertUnauthorized();
    });

    test('markRead marks a notification as read', function () {
        $user = User::factory()->create();
        $notif = createNotificationFor($user, read: false);

        $response = $this->actingAs($user)->postJson("/api/notifications/{$notif->id}/read");

        $response->assertOk();
        $this->assertDatabaseHas('notifications', [
            'id' => $notif->id,
        ]);
        $notif->refresh();
        expect($notif->read_at)->not->toBeNull();
    });

    test('markRead returns 404 for notification belonging to another user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $notif = createNotificationFor($other, read: false);

        $response = $this->actingAs($user)->postJson("/api/notifications/{$notif->id}/read");

        $response->assertNotFound();
    });

    test('markRead returns 401 for guest', function () {
        $user = User::factory()->create();
        $notif = createNotificationFor($user, read: false);

        $response = $this->postJson("/api/notifications/{$notif->id}/read");

        $response->assertUnauthorized();
    });

    test('readAll marks all unread notifications as read', function () {
        $user = User::factory()->create();
        createNotificationFor($user, read: false);
        createNotificationFor($user, read: false);

        $response = $this->actingAs($user)->postJson('/api/notifications/read-all');

        $response->assertNoContent();
        $remaining = $user->unreadNotifications()->count();
        expect($remaining)->toBe(0);
    });

    test('readAll returns 401 for guest', function () {
        $response = $this->postJson('/api/notifications/read-all');

        $response->assertUnauthorized();
    });

    test('destroy deletes a notification', function () {
        $user = User::factory()->create();
        $notif = createNotificationFor($user);

        $response = $this->actingAs($user)->deleteJson("/api/notifications/{$notif->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('notifications', ['id' => $notif->id]);
    });

    test('destroy returns 404 for notification belonging to another user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $notif = createNotificationFor($other);

        $response = $this->actingAs($user)->deleteJson("/api/notifications/{$notif->id}");

        $response->assertNotFound();
    });

    test('destroy returns 401 for guest', function () {
        $user = User::factory()->create();
        $notif = createNotificationFor($user);

        $response = $this->deleteJson("/api/notifications/{$notif->id}");

        $response->assertUnauthorized();
    });
});
