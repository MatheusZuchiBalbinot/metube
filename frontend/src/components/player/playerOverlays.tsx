import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

// Mirrors the type in player.tsx — kept local to avoid coupling.
type SkipIndicator = { dir: 'fwd' | 'bwd'; count: number; key: number };

interface PlayerOverlaysProps {
    isBuffering: boolean
    showCompletion: boolean | undefined
    popIcon: { type: 'play' | 'pause'; key: number } | null
    skipIndicator: SkipIndicator | null
    skipSeconds: number
}

export default function PlayerOverlays({
    isBuffering, showCompletion, popIcon, skipIndicator, skipSeconds,
}: PlayerOverlaysProps) {
    return (
        <>
            {/* Buffering spinner — hidden during completion overlay */}
            {isBuffering && !showCompletion && (
                <div className="vp__buffering">
                    <div className="vp__buffering-spinner" />
                </div>
            )}

            {/* Play/Pause flash icon */}
            {popIcon && (
                <div className="vp__pop-icon" key={popIcon.key}>
                    {popIcon.type === 'play'
                        ? <Play size={52} fill="white" color="white" />
                        : <Pause size={52} fill="white" color="white" />
                    }
                </div>
            )}

            {/* Keyboard skip indicator */}
            {skipIndicator && (
                <div
                    key={skipIndicator.key}
                    className={['vp__skip-indicator', `vp__skip-indicator--${skipIndicator.dir}`].join(' ')}
                >
                    <div className="vp__skip-indicator-icon">
                        {skipIndicator.dir === 'fwd'
                            ? <SkipForward size={26} fill="white" strokeWidth={0} />
                            : <SkipBack size={26} fill="white" strokeWidth={0} />
                        }
                    </div>
                    <span className="vp__skip-indicator-label">
                        {skipIndicator.count * skipSeconds}s
                    </span>
                </div>
            )}

            {/* Completion overlay */}
            {showCompletion && (
                <div className="vp__completion">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" className="vp__completion-icon">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}
        </>
    );
}
