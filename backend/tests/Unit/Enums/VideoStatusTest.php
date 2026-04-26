<?php

use App\Enums\VideoStatus;

describe('VideoStatus Enum', function () {
    test('all statuses have correct values', function () {
        expect(VideoStatus::PUBLISHED->value)->toBe('published');
        expect(VideoStatus::SCHEDULED->value)->toBe('scheduled');
        expect(VideoStatus::PROCESSING->value)->toBe('processing');
        expect(VideoStatus::DRAFT->value)->toBe('draft');
        expect(VideoStatus::FAILED->value)->toBe('failed');
    });

    test('values method returns all status values', function () {
        $values = VideoStatus::values();

        expect($values)->toHaveCount(5);
        expect($values)->toContain('published', 'scheduled', 'processing', 'draft', 'failed');
    });

    test('isPublic returns true only for published status', function () {
        expect(VideoStatus::PUBLISHED->isPublic())->toBeTrue();
        expect(VideoStatus::SCHEDULED->isPublic())->toBeFalse();
        expect(VideoStatus::PROCESSING->isPublic())->toBeFalse();
        expect(VideoStatus::DRAFT->isPublic())->toBeFalse();
        expect(VideoStatus::FAILED->isPublic())->toBeFalse();
    });
});
