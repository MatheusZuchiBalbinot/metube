import { useEffect, useRef, useState } from 'react';

export interface ShakaLevel {
    index: number;
    height: number;
    bitrate: number;
    label: string;
}

// Polyfills need to be installed once per page
let polyfillsInstalled = false;

export function useShaka(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    src: string,
) {
    const playerRef = useRef<shaka.Player | null>(null);
    const [levels, setLevels] = useState<ShakaLevel[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1);

    useEffect(() => {
        const el = videoRef.current;
        const isNotReady = !el || !src;
        if (isNotReady) {
            return;
        }

        let destroyed = false;
        let player: shaka.Player | null = null;

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

            player = new shaka.Player();
            playerRef.current = player;

            player.addEventListener('error', (e: Event) => {
                const detail = (e as CustomEvent).detail;
                // eslint-disable-next-line no-console
                console.warn('[Shaka Error]', detail);
            });

            await player.attach(el);

            if (destroyed) {
                return;
            }

            await player.load(src);

            if (destroyed) {
                return;
            }

            const tracks = player.getVariantTracks();
            const seenHeights = new Set<number>();
            const uniqueLevels: ShakaLevel[] = [];

            tracks.forEach((t, i) => {
                const h = t.height ?? 0;
                if (!seenHeights.has(h)) {
                    seenHeights.add(h);
                    uniqueLevels.push({
                        index: i,
                        height: h,
                        bitrate: t.bandwidth,
                        label: h > 0 ? `${h}p` : 'auto',
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
