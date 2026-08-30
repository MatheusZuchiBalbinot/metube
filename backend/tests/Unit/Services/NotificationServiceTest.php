<?php

declare(strict_types=1);

use App\Models\User;
use App\Notifications\VideoFromSubscriptionNotification;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

/**
 * Creates a DatabaseNotification row for a user without dispatching a real
 * notification, mirroring the pattern used by NotificationsControllerTest.
 */
function createServiceNotificationFor(User $user, bool $read = false): DatabaseNotification
{
    return DatabaseNotification::create([
        'id' => (string) Str::uuid(),
        'type' => VideoFromSubscriptionNotification::class,
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => ['type' => 'video_from_subscription', 'vuid' => 'abc', 'video_title' => 'Test', 'channel_name' => 'Chan'],
        'read_at' => $read ? now() : null,
    ]);
}

describe('NotificationService::list', function () {
    test('returns paginated notifications for the user', function () {
        $user = User::factory()->create();
        createServiceNotificationFor($user);
        createServiceNotificationFor($user);

        $result = app(NotificationService::class)->list($user);

        expect($result->total())->toBe(2);
    });

    test('does not include another user\'s notifications', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        createServiceNotificationFor($other);

        $result = app(NotificationService::class)->list($user);

        expect($result->total())->toBe(0);
    });
});

describe('NotificationService::unreadCount', function () {
    test('counts only unread notifications', function () {
        $user = User::factory()->create();
        createServiceNotificationFor($user, read: false);
        createServiceNotificationFor($user, read: false);
        createServiceNotificationFor($user, read: true);

        $count = app(NotificationService::class)->unreadCount($user);

        expect($count)->toBe(2);
    });

    test('returns zero when the user has no notifications', function () {
        $user = User::factory()->create();

        $count = app(NotificationService::class)->unreadCount($user);

        expect($count)->toBe(0);
    });
});

describe('NotificationService::markRead', function () {
    test('marks the notification as read and returns it', function () {
        $user = User::factory()->create();
        $notification = createServiceNotificationFor($user, read: false);

        $result = app(NotificationService::class)->markRead($user, $notification->id);

        expect($result->id)->toBe($notification->id)
            ->and($result->read_at)->not->toBeNull();
        $notification->refresh();
        expect($notification->read_at)->not->toBeNull();
    });

    test('throws ModelNotFoundException for a notification belonging to another user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $notification = createServiceNotificationFor($other);

        expect(fn () => app(NotificationService::class)->markRead($user, $notification->id))
            ->toThrow(ModelNotFoundException::class);
    });
});

describe('NotificationService::markAllRead', function () {
    test('marks every unread notification for the user as read', function () {
        $user = User::factory()->create();
        createServiceNotificationFor($user, read: false);
        createServiceNotificationFor($user, read: false);

        app(NotificationService::class)->markAllRead($user);

        expect($user->unreadNotifications()->count())->toBe(0);
    });

    test('does not affect another user\'s unread notifications', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        createServiceNotificationFor($other, read: false);

        app(NotificationService::class)->markAllRead($user);

        expect($other->unreadNotifications()->count())->toBe(1);
    });
});

describe('NotificationService::delete', function () {
    test('deletes the notification', function () {
        $user = User::factory()->create();
        $notification = createServiceNotificationFor($user);

        app(NotificationService::class)->delete($user, $notification->id);

        expect(DatabaseNotification::find($notification->id))->toBeNull();
    });

    test('throws ModelNotFoundException for a notification belonging to another user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $notification = createServiceNotificationFor($other);

        expect(fn () => app(NotificationService::class)->delete($user, $notification->id))
            ->toThrow(ModelNotFoundException::class);
    });
});
