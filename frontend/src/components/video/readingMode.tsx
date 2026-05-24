import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { VideoSummary, VideoTranscription } from '@api/videos';
import { Button } from '@ui';
import { parseChapterTimestamp } from '@utils/parseChapterTimestamp';
import { domain } from '@domain';

interface ReadingModeProps {
    summary: VideoSummary | null
    transcription: VideoTranscription
    isOwner: boolean
    onRetryTranscription: () => void
    currentTime?: number
    onSeekToChapter?: (seconds: number) => void
}

interface TranscriptionBodyProps {
    transcription: VideoTranscription
    isOwner: boolean
    onRetry: () => void
}

const WAVEFORM_BARS = [0, 1, 2, 3, 4, 5, 6];

function ProcessingScreen() {
    const { t } = useTranslation();

    return (
        <div className="video-page__transcription-processing">
            <div className="video-page__transcription-waveform" aria-hidden="true">
                {WAVEFORM_BARS.map(i => (
                    <span
                        key={i}
                        className="video-page__transcription-waveform-bar"
                        style={{ animationDelay: `${i * 0.14}s` }}
                    />
                ))}
            </div>
            <h3 className="video-page__transcription-processing-title">
                {t('video.transcription_processing_title')}
            </h3>
            <p className="video-page__transcription-processing-sub">
                {t('video.transcription_processing_sub')}
            </p>
        </div>
    );
}

function TranscriptionBody({ transcription, isOwner, onRetry }: TranscriptionBodyProps) {
    const { t } = useTranslation();

    if (domain.transcription.isFailed(transcription)) {
        return (
            <div className="video-page__transcription-failed">
                <p className="video-page__transcription-error">{t('video.transcription_failed')}</p>
                {isOwner && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                        <RefreshCw size={14} />
                        {t('video.transcription_retry')}
                    </Button>
                )}
            </div>
        );
    }

    const hasContent = transcription.content !== null;

    if (!hasContent) {
        return null;
    }

    return (
        <>
            {transcription.language !== null && (
                <span className="video-page__transcription-lang">
                    {t('video.transcription_language', { lang: transcription.language.toUpperCase() })}
                </span>
            )}
            <p className="video-page__transcription-content">
                {transcription.content}
            </p>
        </>
    );
}

export default function ReadingMode({ summary, transcription, isOwner, onRetryTranscription, currentTime, onSeekToChapter }: ReadingModeProps) {
    const { t } = useTranslation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [readingProgress, setReadingProgress] = useState(0);

    function handleScroll() {
        const el = contentRef.current;

        if (!el) {
            return;
        }

        const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
        setReadingProgress(Math.min(100, pct));
    }

    const isProcessing = domain.transcription.isProcessing(transcription);

    const hasSummaryContent = summary !== null && summary.readingMode.trim() !== '';
    const hasKeyPoints = summary !== null && summary.keyPoints.length > 0;
    const hasChapters = summary !== null && summary.chapters.length > 0;

    const html = hasSummaryContent
        ? DOMPurify.sanitize(
            summary.readingMode
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>'),
        )
        : '';

    if (isProcessing) {
        return (
            <div className="video-page__reading-mode video-page__reading-mode--processing" ref={contentRef}>
                {hasSummaryContent && (
                    <div
                        className="video-page__reading-content"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )}
                <ProcessingScreen />
            </div>
        );
    }

    return (
        <div className="video-page__reading-mode" ref={contentRef} onScroll={handleScroll}>
            <div
                className="video-page__reading-progress"
                style={{ transform: `scaleX(${readingProgress / 100})` }}
            />

            {hasSummaryContent && (
                <div
                    className="video-page__reading-content"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}

            {hasKeyPoints && (
                <section className="video-page__summary-section">
                    <h3 className="video-page__summary-heading">{t('video.key_points')}</h3>
                    <ul className="video-page__key-points">
                        {summary!.keyPoints.map((point, i) => (
                            <li key={i} className="video-page__key-point">{point}</li>
                        ))}
                    </ul>
                </section>
            )}

            {hasChapters && (
                <section className="video-page__summary-section">
                    <h3 className="video-page__summary-heading">{t('video.chapters')}</h3>
                    <ol className="video-page__chapters">
                        {summary!.chapters.map((ch, i) => {
                            const seconds = parseChapterTimestamp(ch.timestamp);
                            const nextSeconds = summary!.chapters[i + 1] !== undefined
                                ? parseChapterTimestamp(summary!.chapters[i + 1].timestamp)
                                : Infinity;
                            const isActive = currentTime !== undefined
                                && currentTime >= seconds
                                && currentTime < nextSeconds;
                            return (
                                <li key={i}>
                                    <button
                                        className={['video-page__chapter', isActive ? 'video-page__chapter--active' : ''].filter(Boolean).join(' ')}
                                        onClick={() => onSeekToChapter?.(seconds)}
                                        disabled={onSeekToChapter === undefined}
                                    >
                                        <span className="video-page__chapter-time">{ch.timestamp}</span>
                                        <span className="video-page__chapter-title">{ch.title}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}

            <div className="video-page__transcription">
                <div className="video-page__transcription-header">
                    <span className="video-page__transcription-title">{t('video.transcription')}</span>
                </div>

                <TranscriptionBody transcription={transcription} isOwner={isOwner} onRetry={onRetryTranscription} />
            </div>
        </div>
    );
}
