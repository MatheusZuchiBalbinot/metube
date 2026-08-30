import DOMPurify from 'dompurify';

/**
 * Renders the small markdown-ish subset used by AI-generated video summaries
 * (`##`/`###` headings, inline `` `code` ``, and blank-line-separated paragraphs)
 * to sanitized HTML.
 *
 * The replacements are order-dependent: headings and inline code must run before
 * the paragraph-wrapping step, which relies on the original `\n\n` boundaries.
 */
export function renderSummaryMarkdown(text: string): string {
    const html = text
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');

    return DOMPurify.sanitize(html);
}
