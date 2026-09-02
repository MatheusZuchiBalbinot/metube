import { useEffect, useRef, useState } from 'react';
import type { default as ShakaNamespace } from 'shaka-player';
import type { ShakaLevel } from '@components/player/playerTypes';
import type { VideoCaption } from '@models';
import { STORAGE_KEYS } from '@utils';

export type { ShakaLevel };

type ShakaPlayer = InstanceType<typeof ShakaNamespace['Player']>;

// Polyfills need to be installed once per page
let polyfillsInstalled = false;

// Persisted preferred quality as a resolution height; -1 means Auto (ABR).
function getSavedQualityHeight(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_QUALITY);
    const parsed = raw === null ? -1 : Number(raw);
    return Number.isFinite(parsed) ? parsed : -1;
}

function ensurePolyfillsInstalled(shaka: typeof ShakaNamespace) {
    if (polyfillsInstalled) {
        return;
    }

    shaka.polyfill.installAll();
    polyfillsInstalled = true;
}

// Native <track> elements do not render when the video src is a MSE blob: URL.
async function loadCaptionTracks(player: ShakaPlayer, captions: VideoCaption[]) {
    for (const caption of captions) {
        try {
            await player.addTextTrackAsync(
                caption.url,
                caption.lang,
                'subtitles',
                'text/vtt',
                undefined,
                caption.label,
            );
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[Shaka Caption]', caption.lang, err);
        }
    }
}

// Disable all text tracks before signalling readiness so the consumer
// starts from a known clean state and can enable only the selected one.
function disableAllTextTracks(el: HTMLVideoElement) {
    for (let i = 0; i < el.textTracks.length; i++) {
        el.textTracks[i].mode = 'disabled';
    }
}

function applySavedQuality(uniqueLevels: ShakaLevel[], setQuality: (levelIndex: number) => void) {
    const savedHeight = getSavedQualityHeight();
    const savedLevel = savedHeight > 0
        ? uniqueLevels.find(level => level.height === savedHeight)
        : undefined;

    if (savedLevel) {
        setQuality(savedLevel.index);
    }
}

export function useShaka(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    src: string,
    captions: VideoCaption[] = [],
) {
    const playerRef = useRef<ShakaPlayer | null>(null);
    const [levels, setLevels] = useState<ShakaLevel[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [tracksLoaded, setTracksLoaded] = useState(false);

    useEffect(() => {
        const el = videoRef.current;
        const isNotReady = !el || !src;
        if (isNotReady) {
            return;
        }

        let destroyed = false;
        let player: ShakaPlayer | null = null;

        const init = async () => {
            const shakaModule = await import('shaka-player');
            const shaka = shakaModule.default;

            ensurePolyfillsInstalled(shaka);

            if (destroyed) {
                return;
            }

            player = new shaka.Player() as ShakaPlayer;
            playerRef.current = player;

            player.addEventListener('error', (e: Event) => {
                const detail = (e as CustomEvent).detail;
                // eslint-disable-next-line no-console
                console.warn('[Shaka Error]', detail);
            });

            await player.attach(el);

            /* v8 ignore next 3 */
            if (destroyed) {
                return;
            }

            await player.load(src);

            /* v8 ignore next 3 */
            if (destroyed) {
                return;
            }

            const tracks = player.getVariantTracks();
            const seenHeights = new Set<number>();
            const uniqueLevels: ShakaLevel[] = [];

            tracks.forEach((track, index) => {
                const trackHeight = track.height ?? 0;
                if (!seenHeights.has(trackHeight)) {
                    seenHeights.add(trackHeight);
                    uniqueLevels.push({
                        index,
                        height: trackHeight,
                        bitrate: track.bandwidth,
                        label: trackHeight > 0 ? `${trackHeight}p` : 'auto',
                    });
                }
            });

            setLevels(uniqueLevels.sort((a, b) => b.height - a.height));

            applySavedQuality(uniqueLevels, setQuality);

            await loadCaptionTracks(player, captions);

            disableAllTextTracks(el);

            /* v8 ignore next 3 */
            if (!destroyed) {
                setTracksLoaded(true);
            }
        };

        init().catch(err => {
            // eslint-disable-next-line no-console
            console.error('[Shaka Load Error]', err);
        });

        return () => {
            destroyed = true;
            player?.destroy();
            playerRef.current = null;
            setLevels([]);
            setCurrentQuality(-1);
            setTracksLoaded(false);
        };
    // captions intentionally omitted: they are loaded once per src load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, videoRef]);

    function setQuality(levelIndex: number) {
        const player = playerRef.current;
        if (!player) {
            return;
        }

        if (levelIndex === -1) {
            player.configure({ abr: { enabled: true } });
            setCurrentQuality(-1);
            localStorage.setItem(STORAGE_KEYS.PLAYER_QUALITY, '-1');
            return;
        }

        player.configure({ abr: { enabled: false } });
        const tracks = player.getVariantTracks();
        const isValid = levelIndex < tracks.length;
        if (isValid) {
            player.selectVariantTrack(tracks[levelIndex], true);
            setCurrentQuality(levelIndex);
            localStorage.setItem(STORAGE_KEYS.PLAYER_QUALITY, String(tracks[levelIndex].height ?? -1));
        }
    }

    return { levels, currentQuality, setQuality, tracksLoaded };
}
