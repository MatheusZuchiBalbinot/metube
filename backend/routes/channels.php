<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Private: only the authenticated user may receive their own notifications
Broadcast::channel('users.{uuid}', function (User $user, string $uuid): bool {
    return $user->uuid === $uuid;
});

// Public: any visitor may listen to real-time updates on a video
Broadcast::channel('videos.{vuid}', function (): bool {
    return true;
});
