<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword
{
    /**
     * Build the mail message for password reset.
     *
     * The reset link points to the frontend SPA so the user lands on the
     * React form instead of a server-rendered page.
     *
     * @param mixed $notifiable The user receiving the notification
     */
    public function toMail(mixed $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
        $resetUrl = "{$frontendUrl}/reset-password/{$this->token}?email=" . urlencode((string) $notifiable->email);

        return (new MailMessage())
            ->subject('Reset Your Password')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset Password', $resetUrl)
            ->line('This password reset link will expire in 60 minutes.')
            ->line('If you did not request a password reset, no further action is required.');
    }
}
