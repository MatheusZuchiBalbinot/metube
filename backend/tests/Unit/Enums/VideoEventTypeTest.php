<?php

declare(strict_types=1);

use App\Enums\VideoEventType;

describe('VideoEventType Enum', function () {
    test('all expected cases exist with correct values', function () {
        expect(VideoEventType::VIEW->value)->toBe('view');
        expect(VideoEventType::LIKE->value)->toBe('like');
        expect(VideoEventType::DISLIKE->value)->toBe('dislike');
        expect(VideoEventType::SAVE->value)->toBe('save');
        expect(VideoEventType::FINISH->value)->toBe('finish');
        expect(VideoEventType::SKIP->value)->toBe('skip');
        expect(VideoEventType::UNLIKE->value)->toBe('unlike');
        expect(VideoEventType::UNDISLIKE->value)->toBe('undislike');
        expect(VideoEventType::UNSAVE->value)->toBe('unsave');
        expect(VideoEventType::IMPRESSION->value)->toBe('impression');
        expect(VideoEventType::CLICK->value)->toBe('click');
        expect(VideoEventType::SUBSCRIBE->value)->toBe('subscribe');
        expect(VideoEventType::UNSUBSCRIBE->value)->toBe('unsubscribe');
        expect(VideoEventType::SEARCH->value)->toBe('search');
    });

    test('isPositiveSignal returns true for affinity-positive events', function () {
        expect(VideoEventType::LIKE->isPositiveSignal())->toBeTrue();
        expect(VideoEventType::SAVE->isPositiveSignal())->toBeTrue();
        expect(VideoEventType::FINISH->isPositiveSignal())->toBeTrue();
        expect(VideoEventType::SUBSCRIBE->isPositiveSignal())->toBeTrue();
        expect(VideoEventType::CLICK->isPositiveSignal())->toBeTrue();
    });

    test('isPositiveSignal returns false for non-positive events', function () {
        expect(VideoEventType::VIEW->isPositiveSignal())->toBeFalse();
        expect(VideoEventType::IMPRESSION->isPositiveSignal())->toBeFalse();
        expect(VideoEventType::SEARCH->isPositiveSignal())->toBeFalse();
        expect(VideoEventType::DISLIKE->isPositiveSignal())->toBeFalse();
        expect(VideoEventType::SKIP->isPositiveSignal())->toBeFalse();
    });

    test('isNegativeSignal returns true for affinity-negative events', function () {
        expect(VideoEventType::DISLIKE->isNegativeSignal())->toBeTrue();
        expect(VideoEventType::SKIP->isNegativeSignal())->toBeTrue();
        expect(VideoEventType::UNLIKE->isNegativeSignal())->toBeTrue();
        expect(VideoEventType::UNSAVE->isNegativeSignal())->toBeTrue();
        expect(VideoEventType::UNSUBSCRIBE->isNegativeSignal())->toBeTrue();
    });

    test('isNegativeSignal returns false for non-negative events', function () {
        expect(VideoEventType::LIKE->isNegativeSignal())->toBeFalse();
        expect(VideoEventType::SAVE->isNegativeSignal())->toBeFalse();
        expect(VideoEventType::CLICK->isNegativeSignal())->toBeFalse();
    });
});
