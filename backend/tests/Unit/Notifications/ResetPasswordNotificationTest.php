<?php

declare(strict_types=1);

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('ResetPasswordNotification', function () {
    test('reset link points to the frontend SPA, not the Laravel backend', function () {
        config(['app.frontend_url' => 'http://localhost:5173']);

        $user = User::factory()->create(['email' => 'test@example.com']);
        $notification = new ResetPasswordNotification('test-token-123');

        $mail = $notification->toMail($user);

        $actionUrl = $mail->actionUrl;
        expect($actionUrl)->toContain('localhost:5173')
            ->toContain('reset-password')
            ->toContain('test-token-123')
            ->toContain(urlencode('test@example.com'));
    });

    test('mail subject is set correctly', function () {
        $user = User::factory()->create();
        $notification = new ResetPasswordNotification('any-token');

        $mail = $notification->toMail($user);

        expect($mail->subject)->toBe('Reset Your Password');
    });
});
