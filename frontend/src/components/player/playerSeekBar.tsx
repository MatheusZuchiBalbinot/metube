import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoChapter } from '@api';
import type { Seconds } from '@models';
import { formatDuration, parseChapterTimestamp } from '@utils';
import { useSeekDrag, useSeekPreview } from '@hooks';

const PREVIEW_W = 160;
const PREVIEW_HALF_W = PREVIEW_W / 2;

interface PlayerSeekBarProps {
    videoRef: React.RefObject<HTMLVideoElement | null>
    src: string
    duration: number
    bufferedPct: number
    currentTime: number
    chapters?: VideoChapter[]
    abRepeat?: { a: number | null; b: number | null }
    forceShow: () => void
    scheduleHideControls: () => void
    onDraggingChange: (isDragging: boolean) => void
}

export default function PlayerSeekBar({
    videoRef, src, duration, bufferedPct, currentTime,
    chapters, abRepeat, forceShow, scheduleHideControls, onDraggingChange,
}: PlayerSeekBarProps) {
    const { t } = useTranslation();

    const seekInnerRef = useRef<HTMLDivElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const {
        isDragging, dragPct, hoverSeekPct,
        handleSeekClick, handleSeekMouseDown, handleSeekMouseMove, handleSeekMouseLeave,
        resetDragState,
    } = useSeekDrag(seekInnerRef, videoRef, { duration, forceShow, scheduleHideControls, onDraggingChange });

    const { seekInnerWidth, handlePreviewSeeked, resetPreview } = useSeekPreview(
        seekInnerRef, previewVideoRef, previewCanvasRef, { hoverSeekPct, duration },
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of own state when the source changes
        resetDragState();
        resetPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    function handleChapterClick(e: React.MouseEvent, timestamp: string) {
        e.stopPropagation();
        const el = videoRef.current;

        if (!el) {
            return;
        }

        el.currentTime = parseChapterTimestamp(timestamp);
    }

    function renderChapters() {
        const hasChapters = chapters !== undefined && chapters.length > 0 && duration > 0;

        if (!hasChapters) {
            return null;
        }

        return chapters.map((ch, i) => {
            const chPct = (parseChapterTimestamp(ch.timestamp) / duration) * 100;
            const isVisible = chPct > 0.5 && chPct < 99.5;

            if (!isVisible) {
                return null;
            }

            return (
                <div
                    key={i}
                    className="vp__chapter-dot"
                    style={{ left: `${chPct}%` }}
                    title={ch.title}
                    onClick={e => handleChapterClick(e, ch.timestamp)}
                />
            );
        });
    }

    function renderAbMarkers() {
        const a = abRepeat?.a ?? null;
        const b = abRepeat?.b ?? null;

        if (a === null || duration <= 0) {
            return null;
        }

        const aPct = (a / duration) * 100;
        const bPct = b !== null ? (b / duration) * 100 : null;

        return (
            <>
                {bPct !== null && (
                    <div
                        className="vp__seek-ab-region"
                        style={{ left: `${aPct}%`, width: `${bPct - aPct}%` }}
                    />
                )}
                <div className="vp__seek-ab-marker vp__seek-ab-marker--a" style={{ left: `${aPct}%` }}>
                    <span className="vp__seek-ab-flag">A</span>
                </div>
                {bPct !== null && (
                    <div className="vp__seek-ab-marker vp__seek-ab-marker--b" style={{ left: `${bPct}%` }}>
                        <span className="vp__seek-ab-flag">B</span>
                    </div>
                )}
            </>
        );
    }

    // ─── Derived values ────────────────────────────────────────────────────────

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const displayPct = isDragging && dragPct !== null ? dragPct * 100 : progressPct;
    const activePct = hoverSeekPct !== null ? hoverSeekPct * 100 : displayPct;

    const activePixel = seekInnerWidth > 0 ? (activePct / 100) * seekInnerWidth : 0;
    const maxClamp = Math.max(seekInnerWidth - PREVIEW_HALF_W, PREVIEW_HALF_W);
    const clampedPixel = Math.min(Math.max(activePixel, PREVIEW_HALF_W), maxClamp);
    const arrowOffset = activePixel - clampedPixel;
    const arrowLeftPct = Math.min(Math.max(50 + (arrowOffset / PREVIEW_W) * 100, 8), 92);
    const hoverTime = (hoverSeekPct !== null ? hoverSeekPct : (dragPct ?? 0)) * duration;

    function renderPreview() {
        const showHoverElements = hoverSeekPct !== null || isDragging;
        if (!showHoverElements || duration <= 0) {
            return null;
        }
        return (
            <div
                className="vp__seek-preview"
                style={{
                    '--preview-left': `${activePct}%`,
                    '--arrow-left': `${arrowLeftPct}%`,
                } as React.CSSProperties}
            >
                <canvas
                    ref={previewCanvasRef}
                    className="vp__seek-preview-canvas"
                    width={160}
                    height={90}
                />
                <span className="vp__seek-preview-time">
                    {formatDuration(hoverTime as Seconds)}
                </span>
            </div>
        );
    }

    return (
        <>
            {/* Hidden video used only for scrubbing frame capture */}
            <video
                ref={previewVideoRef}
                className="vp__preview-video"
                src={src}
                muted
                preload="metadata"
                onSeeked={handlePreviewSeeked}
            />

            <div
                className="vp__seek"
                role="slider"
                tabIndex={0}
                aria-label={t('player.seek_bar')}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
                aria-valuetext={`${formatDuration(currentTime as Seconds)} / ${formatDuration(duration as Seconds)}`}
                onClick={handleSeekClick}
                onMouseDown={handleSeekMouseDown}
                onMouseMove={handleSeekMouseMove}
                onMouseLeave={handleSeekMouseLeave}
            >
                <div className="vp__seek-inner" ref={seekInnerRef}>
                    <div className="vp__seek-track">
                        <div className="vp__seek-buffered" style={{ transform: `scaleX(${bufferedPct / 100})` }} />
                        <div className="vp__seek-fill" style={{ transform: `scaleX(${displayPct / 100})` }} />
                    </div>

                    {renderChapters()}

                    {renderAbMarkers()}

                    <div className="vp__seek-thumb vp__seek-thumb--current" style={{ left: `${displayPct}%` }} />

                    {renderPreview()}
                </div>
            </div>
        </>
    );
}
