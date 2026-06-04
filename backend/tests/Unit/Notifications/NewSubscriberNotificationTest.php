<?php

declare(strict_types=1);

use App\Enums\NotificationType;
use App\Models\User;
use App\Notifications\NewSubscriberNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\BroadcastMessage;

uses(RefreshDatabase::class);

describe('NewSubscriberNotification', function () {
    test('payload includes correct type and subscriber name', function () {
        $subscriber = User::factory()->create(['name' => 'Bob']);

        $payload = (new NewSubscriberNotification($subscriber))->toArray(new stdClass());

        expect($payload['type'])->toBe(NotificationType::NEW_SUBSCRIBER->value)
            ->and($payload['subscriber_name'])->toBe('Bob');
    });

    test('sends via database and broadcast channels', function () {
        $subscriber = User::factory()->create();

        $via = (new NewSubscriberNotification($subscriber))->via(new stdClass());

        expect($via)->toContain('database')->toContain('broadcast');
    });

    test('toBroadcast returns BroadcastMessage with payload', function () {
        $subscriber = User::factory()->create(['name' => 'Bob']);

        $notification = new NewSubscriberNotification($subscriber);
        $broadcast = $notification->toBroadcast(new stdClass());

        expect($broadcast)->toBeInstanceOf(BroadcastMessage::class)
            ->and($broadcast->data['type'])->toBe(NotificationType::NEW_SUBSCRIBER->value)
            ->and($broadcast->data['subscriber_name'])->toBe('Bob');
    });
});
