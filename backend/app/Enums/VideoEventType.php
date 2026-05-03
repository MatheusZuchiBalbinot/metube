<?php

namespace App\Enums;

enum VideoEventType: string
{
    case VIEW = 'view';
    case LIKE = 'like';
    case DISLIKE = 'dislike';
    case SAVE = 'save';
    case FINISH = 'finish';
    case SKIP = 'skip';
    case UNLIKE = 'unlike';
    case UNDISLIKE = 'undislike';
    case UNSAVE = 'unsave';
    case IMPRESSION = 'impression';
    case CLICK = 'click';
    case SUBSCRIBE = 'subscribe';
    case UNSUBSCRIBE = 'unsubscribe';
    case SEARCH = 'search';

    /**
     * Whether the event represents positive affinity toward a video or channel.
     */
    public function isPositiveSignal(): bool
    {
        return match ($this) {
            self::LIKE, self::SAVE, self::FINISH, self::SUBSCRIBE, self::CLICK => true,
            default => false,
        };
    }

    /**
     * Whether the event represents negative affinity toward a video or channel.
     */
    public function isNegativeSignal(): bool
    {
        return match ($this) {
            self::DISLIKE, self::SKIP, self::UNLIKE, self::UNSAVE, self::UNSUBSCRIBE => true,
            default => false,
        };
    }
}
