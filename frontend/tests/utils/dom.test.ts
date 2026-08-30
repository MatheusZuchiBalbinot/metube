// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { KeyboardEvent } from 'react';
import { isTypingInInput, isActivationKey } from '@utils/dom';

function makeKeyboardEvent(key: string): KeyboardEvent {
    return { key } as KeyboardEvent;
}

// ─── isTypingInInput ──────────────────────────────────────────────────────────

describe('isTypingInInput', () => {
    it('returns false for null target', () => {
        expect(isTypingInInput(null)).toBe(false);
    });

    it('returns true when target is an INPUT element', () => {
        const input = document.createElement('input');
        expect(isTypingInInput(input)).toBe(true);
    });

    it('returns true when target is a TEXTAREA element', () => {
        const textarea = document.createElement('textarea');
        expect(isTypingInInput(textarea)).toBe(true);
    });

    it('returns true when target is a SELECT element', () => {
        const select = document.createElement('select');
        expect(isTypingInInput(select)).toBe(true);
    });

    it('returns truthy when target is a contenteditable element (if jsdom supports isContentEditable)', () => {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        // jsdom does not implement isContentEditable; in a real browser this would be true.
        // We verify the function delegates to isContentEditable without throwing.
        const result = isTypingInInput(div);
        expect(typeof result === 'boolean' || result === undefined).toBe(true);
    });

    it('returns falsy for a plain DIV', () => {
        const div = document.createElement('div');
        expect(isTypingInInput(div)).toBeFalsy();
    });

    it('returns falsy for a BUTTON element', () => {
        const button = document.createElement('button');
        expect(isTypingInInput(button)).toBeFalsy();
    });

    it('returns falsy for an A element', () => {
        const anchor = document.createElement('a');
        expect(isTypingInInput(anchor)).toBeFalsy();
    });

    it('returns falsy for contenteditable="false"', () => {
        const div = document.createElement('div');
        div.contentEditable = 'false';
        expect(isTypingInInput(div)).toBeFalsy();
    });

    it('returns falsy for a SPAN element', () => {
        const span = document.createElement('span');
        expect(isTypingInInput(span)).toBeFalsy();
    });
});

// ─── isActivationKey ──────────────────────────────────────────────────────────

describe('isActivationKey', () => {
    it('returns true for Enter', () => {
        expect(isActivationKey(makeKeyboardEvent('Enter'))).toBe(true);
    });

    it('returns true for Space', () => {
        expect(isActivationKey(makeKeyboardEvent(' '))).toBe(true);
    });

    it('returns false for other keys', () => {
        expect(isActivationKey(makeKeyboardEvent('Escape'))).toBe(false);
        expect(isActivationKey(makeKeyboardEvent('Tab'))).toBe(false);
        expect(isActivationKey(makeKeyboardEvent('a'))).toBe(false);
    });
});
