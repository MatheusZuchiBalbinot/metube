<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * VideoStatus — Video publication status enum.
 *
 * Values:
 * - PUBLISHED: Video is live and visible to everyone
 * - SCHEDULED: Video will be published at scheduled_at time
 * - PROCESSING: Video is being processed (transcoding, thumbnail generation)
 * - DRAFT: Video is a draft, not yet published
 * - FAILED: Video processing failed permanently
 */
enum VideoStatus: string
{
    case PUBLISHED = 'published';
    case SCHEDULED = 'scheduled';
    case PROCESSING = 'processing';
    case DRAFT = 'draft';
    case FAILED = 'failed';

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
     * Check if video is publicly visible.
     */
    public function isPublic(): bool
    {
        return $this === self::PUBLISHED;
    }
}
