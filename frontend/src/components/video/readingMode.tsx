import { useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import type { VideoSummary } from '@data/mockSummaries';

interface ReadingModeProps {
    summary: VideoSummary
}

export default function ReadingMode({ summary }: ReadingModeProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [readingProgress, setReadingProgress] = useState(0);

    function handleScroll() {
        const el = contentRef.current;
        if (!el) { return; }
        const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
        setReadingProgress(Math.min(100, pct));
    }

    const html = DOMPurify.sanitize(
        summary.readingMode
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>'),
    );

    return (
        <div className="video-page__reading-mode" ref={contentRef} onScroll={handleScroll}>
            <div
                className="video-page__reading-progress"
                style={{ transform: `scaleX(${readingProgress / 100})` }}
            />
            <div
                className="video-page__reading-content"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}
