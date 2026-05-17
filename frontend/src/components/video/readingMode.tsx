import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { VideoSummary, VideoTranscription } from '@api/videos';
import { Button } from '@ui';

interface ReadingModeProps {
    summary: VideoSummary | null
    transcription: VideoTranscription
    isOwner: boolean
    onRetryTranscription: () => void
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

    if (transcription.status === 'failed') {
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

export default function ReadingMode({ summary, transcription, isOwner, onRetryTranscription }: ReadingModeProps) {
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

    const isProcessing = transcription.status === 'pending' || transcription.status === 'processing';

    const hasSummaryContent = summary !== null && summary.readingMode.trim() !== '';

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

            <div className="video-page__transcription">
                <div className="video-page__transcription-header">
                    <span className="video-page__transcription-title">{t('video.transcription')}</span>
                </div>

                <TranscriptionBody transcription={transcription} isOwner={isOwner} onRetry={onRetryTranscription} />
            </div>
        </div>
    );
}
