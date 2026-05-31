<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * ReactionType — User reaction to video enum.
 *
 * Values:
 * - LIKE: User liked the video
 * - DISLIKE: User disliked the video
 */
enum ReactionType: string
{
    case LIKE = 'like';
    case DISLIKE = 'dislike';

    /**
     * Get all available values as array.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /**
     * Get opposite reaction.
     */
    public function opposite(): self
    {
        return match ($this) {
            self::LIKE => self::DISLIKE,
            self::DISLIKE => self::LIKE,
        };
    }
}
