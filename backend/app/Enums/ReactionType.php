<?php

declare(strict_types=1);

namespace App\Enums;

enum ReactionType: string
{
    case LIKE = 'like';
    case DISLIKE = 'dislike';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    public function opposite(): self
    {
        return match ($this) {
            self::LIKE => self::DISLIKE,
            self::DISLIKE => self::LIKE,
        };
    }
}
