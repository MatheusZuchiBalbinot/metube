// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderSummaryMarkdown } from '@utils/markdown';

describe('renderSummaryMarkdown', () => {
    it('wraps plain text in a single paragraph', () => {
        expect(renderSummaryMarkdown('Hello world')).toBe('<p>Hello world</p>');
    });

    it('converts ## headings to h2', () => {
        // DOMPurify normalizes the DOM per HTML parsing rules: a block element like
        // <h2> can't nest inside <p>, so the sanitizer splits the paragraph around it.
        expect(renderSummaryMarkdown('## Section title')).toBe('<p></p><h2>Section title</h2><p></p>');
    });

    it('converts ### headings to h3', () => {
        expect(renderSummaryMarkdown('### Subsection')).toBe('<p></p><h3>Subsection</h3><p></p>');
    });

    it('converts inline `code` spans', () => {
        expect(renderSummaryMarkdown('Run `npm test` now')).toBe('<p>Run <code>npm test</code> now</p>');
    });

    it('splits blank-line-separated blocks into paragraphs', () => {
        expect(renderSummaryMarkdown('First para.\n\nSecond para.'))
            .toBe('<p>First para.</p><p>Second para.</p>');
    });

    it('combines headings, code, and paragraphs together', () => {
        const input = '## Overview\n\nUse `git status` to check.\n\n### Details\n\nMore text.';
        const result = renderSummaryMarkdown(input);

        expect(result).toBe(
            '<p></p><h2>Overview</h2><p></p><p>Use <code>git status</code> to check.</p>'
            + '<p></p><h3>Details</h3><p></p><p>More text.</p>',
        );
    });

    it('strips unsafe HTML via sanitization', () => {
        const result = renderSummaryMarkdown('<script>alert(1)</script>Safe text');

        expect(result).not.toContain('<script>');
        expect(result).toContain('Safe text');
    });

    it('returns an empty paragraph for an empty string', () => {
        expect(renderSummaryMarkdown('')).toBe('<p></p>');
    });
});
