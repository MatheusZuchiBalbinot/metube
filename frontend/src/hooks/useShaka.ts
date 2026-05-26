import { useEffect, useRef, useState } from 'react';
import type { default as ShakaNamespace } from 'shaka-player';
import type { ShakaLevel } from '@components/player/playerTypes';

export type { ShakaLevel };

type ShakaPlayer = InstanceType<typeof ShakaNamespace['Player']>;

// Polyfills need to be installed once per page
let polyfillsInstalled = false;

export function useShaka(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    src: string,
) {
    const playerRef = useRef<ShakaPlayer | null>(null);
    const [levels, setLevels] = useState<ShakaLevel[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1);

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

            if (!polyfillsInstalled) {
                shaka.polyfill.installAll();
                polyfillsInstalled = true;
            }

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
        };
    }, [src, videoRef]);

    function setQuality(levelIndex: number) {
        const player = playerRef.current;
        if (!player) {
            return;
        }

        if (levelIndex === -1) {
            player.configure({ abr: { enabled: true } });
            setCurrentQuality(-1);
            return;
        }

        player.configure({ abr: { enabled: false } });
        const tracks = player.getVariantTracks();
        const isValid = levelIndex < tracks.length;
        if (isValid) {
            player.selectVariantTrack(tracks[levelIndex], true);
            setCurrentQuality(levelIndex);
        }
    }

    return { levels, currentQuality, setQuality };
}
