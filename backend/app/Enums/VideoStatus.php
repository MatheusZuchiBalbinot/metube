<?php

declare(strict_types=1);

namespace App\Enums;

enum VideoStatus: string
{
    case PUBLISHED = 'published';
    case SCHEDULED = 'scheduled';
    case PROCESSING = 'processing';
    case DRAFT = 'draft';
    case FAILED = 'failed';

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    public function isPublic(): bool
    {
        return $this === self::PUBLISHED;
    }
}
