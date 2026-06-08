import { useRef, useState, useEffect } from 'react';
import type { VideoChapter } from '@api';
import { formatDuration, parseChapterTimestamp } from '@utils';

// Width of the scrubber thumbnail preview (px).
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
    const seekInnerRef = useRef<HTMLDivElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const wasDraggingRef = useRef(false);

    const [hoverSeekPct, setHoverSeekPct] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPct, setDragPct] = useState<number | null>(null);
    const [seekInnerWidth, setSeekInnerWidth] = useState(0);

    function changeDragging(v: boolean) {
        setIsDragging(v);
        onDraggingChange(v);
    }

    // Reset own state when video source changes
    useEffect(() => {
        changeDragging(false);
        setDragPct(null);
        setHoverSeekPct(null);
        wasDraggingRef.current = false;
        const canvas = previewCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // Track seek inner width for precise preview-arrow alignment
    useEffect(() => {
        const el = seekInnerRef.current;
        if (!el) {
            return;
        }
        const ro = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                setSeekInnerWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Seek the hidden preview video to the cursor hover position
    useEffect(() => {
        const pv = previewVideoRef.current;

        if (!pv || hoverSeekPct === null || duration === 0) {
            return;
        }

        pv.currentTime = hoverSeekPct * duration;
    }, [hoverSeekPct, duration]);

    // Attach document-level mousemove/mouseup while dragging
    useEffect(() => {
        if (!isDragging) {
            return;
        }
        forceShow();

        function getPctFromEvent(e: MouseEvent): number {
            const inner = seekInnerRef.current;
            if (!inner) {
                return 0;
            }
            const rect = inner.getBoundingClientRect();
            return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        }

        function onMouseMove(e: MouseEvent) {
            const pct = getPctFromEvent(e);
            setDragPct(pct);
            setHoverSeekPct(pct);
        }

        function onMouseUp(e: MouseEvent) {
            const el = videoRef.current;
            if (el && el.duration > 0) {
                el.currentTime = getPctFromEvent(e) * el.duration;
            }
            wasDraggingRef.current = true;
            changeDragging(false);
            setDragPct(null);
            setHoverSeekPct(null);
            scheduleHideControls();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    function handlePreviewSeeked() {
        const pv = previewVideoRef.current;
        const canvas = previewCanvasRef.current;
        if (!pv || !canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        try {
            ctx.drawImage(pv, 0, 0, canvas.width, canvas.height);
        } catch { /* CORS/decode error — canvas stays black */ }
    }

    function getSeekPct(e: React.MouseEvent<HTMLDivElement> | MouseEvent): number {
        const inner = seekInnerRef.current;
        if (!inner) {
            return 0;
        }
        const rect = inner.getBoundingClientRect();
        const clientX = 'clientX' in e ? (e as MouseEvent).clientX : (e as TouchEvent).touches[0].clientX;
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

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
                    {formatDuration(hoverTime)}
                </span>
            </div>
        );
    }

    function handleSeekClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        if (wasDraggingRef.current) {
            wasDraggingRef.current = false;
            return;
        }
        const el = videoRef.current;
        const hasDuration = duration > 0;
        if (!el || !hasDuration) {
            return;
        }
        el.currentTime = getSeekPct(e) * duration;
    }

    function handleSeekMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();
        const pct = getSeekPct(e);
        changeDragging(true);
        setDragPct(pct);
        setHoverSeekPct(pct);
    }

    function handleSeekMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!isDragging) {
            setHoverSeekPct(getSeekPct(e));
        }
    }

    function handleSeekMouseLeave() {
        if (!isDragging) {
            setHoverSeekPct(null);
        }
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
