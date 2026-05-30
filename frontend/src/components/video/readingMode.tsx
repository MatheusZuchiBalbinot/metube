import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Sparkles, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { VideoSummary, VideoTranscription } from '@api';
import { Button, Spinner } from '@ui';
import { parseChapterTimestamp, cn } from '@utils';
import { domain } from '@domain';

interface ReadingModeProps {
    summary: VideoSummary | null
    transcription: VideoTranscription
    isOwner: boolean
    onRetryTranscription: () => void
    currentTime?: number
    onSeekToChapter?: (seconds: number) => void
    videoRef?: React.RefObject<HTMLVideoElement | null>
}

interface TranscriptionBodyProps {
    transcription: VideoTranscription
    isOwner: boolean
    onRetry: () => void
}

const WAVEFORM_BARS = [0, 1, 2, 3, 4, 5, 6];

interface ProcessingScreenProps {
    titleKey: string
    subKey: string
}

function ProcessingScreen({ titleKey, subKey }: ProcessingScreenProps) {
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
                {t(titleKey)}
            </h3>
            <p className="video-page__transcription-processing-sub">
                {t(subKey)}
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
                    <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={onRetry}>
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

export default function ReadingMode({ summary, transcription, isOwner, onRetryTranscription, currentTime, onSeekToChapter, videoRef }: ReadingModeProps) {
    const { t } = useTranslation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [readingProgress, setReadingProgress] = useState(0);
    const [seekingIndex, setSeekingIndex] = useState<number | null>(null);

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
    const hasSummary = hasSummaryContent || hasKeyPoints || hasChapters;
    const isSummaryGenerating = domain.transcription.isCompleted(transcription) && !hasSummary;

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
                <ProcessingScreen
                    titleKey="video.transcription_processing_title"
                    subKey="video.transcription_processing_sub"
                />
            </div>
        );
    }

    return (
        <div className="video-page__reading-mode" ref={contentRef} onScroll={handleScroll}>
            <div
                className="video-page__reading-progress"
                style={{ transform: `scaleX(${readingProgress / 100})` }}
            />

            {/* Transcription — raw output card */}
            <section className="video-page__transcription-block">
                <header className="video-page__rm-section-header">
                    <FileText size={13} aria-hidden="true" />
                    <span>{t('video.transcription')}</span>
                </header>
                <TranscriptionBody transcription={transcription} isOwner={isOwner} onRetry={onRetryTranscription} />
            </section>

            {/* AI Summary — article + key points + chapters */}
            {hasSummary && (
                <section className="video-page__reading-summary">
                    <header className="video-page__rm-section-header video-page__rm-section-header--ai">
                        <Sparkles size={13} aria-hidden="true" />
                        <span>{t('video.summary')}</span>
                    </header>

                    {hasSummaryContent && (
                        <div
                            className="video-page__reading-content"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    )}

                    {hasKeyPoints && (
                        <div className="video-page__reading-subsection">
                            <h4 className="video-page__reading-subheading">{t('video.key_points')}</h4>
                            <ul className="video-page__key-points">
                                {summary!.keyPoints.map((point, i) => (
                                    <li key={i} className="video-page__key-point">{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {hasChapters && (
                        <div className="video-page__reading-subsection">
                            <h4 className="video-page__reading-subheading">{t('video.chapters')}</h4>
                            <ol className="video-page__chapters">
                                {summary!.chapters.map((ch, i) => {
                                    const seconds = parseChapterTimestamp(ch.timestamp);
                                    const nextSeconds = summary!.chapters[i + 1] !== undefined
                                        ? parseChapterTimestamp(summary!.chapters[i + 1].timestamp)
                                        : Infinity;
                                    const isActive = currentTime !== undefined
                                        && currentTime >= seconds
                                        && currentTime < nextSeconds;
                                    const isSeeking = seekingIndex === i;

                                    return (
                                        <li key={i}>
                                            <button
                                                className={cn('video-page__chapter', isActive && 'video-page__chapter--active')}
                                                disabled={onSeekToChapter === undefined || isSeeking}
                                                onClick={() => {
                                                    if (!onSeekToChapter) {
                                                        return;
                                                    }
                                                    setSeekingIndex(i);
                                                    onSeekToChapter(seconds);
                                                    videoRef?.current?.addEventListener('seeked', () => {
                                                        setSeekingIndex(null);
                                                    }, { once: true });
                                                }}
                                            >
                                                {isSeeking
                                                    ? <Spinner size="sm" className="video-page__chapter-spinner" />
                                                    : <span className="video-page__chapter-time">{ch.timestamp}</span>
                                                }
                                                <span className="video-page__chapter-title">{ch.title}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}
                </section>
            )}

            {/* AI Summary still being generated after transcription completed */}
            {isSummaryGenerating && (
                <section className="video-page__reading-summary">
                    <header className="video-page__rm-section-header video-page__rm-section-header--ai">
                        <Sparkles size={13} aria-hidden="true" />
                        <span>{t('video.summary')}</span>
                    </header>
                    <ProcessingScreen
                        titleKey="video.summary_processing_title"
                        subKey="video.summary_processing_sub"
                    />
                </section>
            )}
        </div>
    );
}
