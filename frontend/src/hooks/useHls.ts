/**
 * Hook for HLS streaming support.
 * Handles adaptive bitrate streaming with fallback to native browser HLS
 * and direct MP4 playback.
 */

import { useEffect, useRef } from 'react';

interface HlsLevel {
    height: number;
    bitrate: number;
}

export function useHls(videoRef: React.RefObject<HTMLVideoElement | null>, src: string) {
    const hlsRef = useRef<any>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        // Cleanup previous instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        // If it's not an HLS playlist, use native playback
        const isHls = src.endsWith('.m3u8');
        if (!isHls) {
            video.src = src;
            return;
        }

        // Check if browser supports HLS natively (Safari, some mobile browsers)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            return;
        }

        // Use hls.js for browsers that don't support HLS natively
        const loadHls = async () => {
            const HlsClass = (await import('hls.js')).default;

            // Check if HLS.js is supported in this browser
            if (!HlsClass.isSupported()) {
                // Fallback to native if HLS.js not supported (shouldn't happen in modern browsers)
                video.src = src;
                return;
            }

            const hls = new HlsClass({
                startLevel: -1, // -1 means auto quality selection
                autoStartLoad: true,
            });

            hls.loadSource(src);
            hls.attachMedia(video);

            // Store reference for quality changes
            hlsRef.current = hls;

            // Optional: log HLS events
            hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
                // Manifest loaded, HLS is ready
            });

            hls.on(HlsClass.Events.ERROR, (_event: any, data: any) => {
                console.warn('[HLS Error]', data);
            });
        };

        loadHls().catch(err => {
            console.error('[HLS Load Error]', err);
            // Fallback to direct src
            video.src = src;
        });

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, videoRef]);

    // Return quality API for PlayerSettings integration (future enhancement)
    return {
        get levels(): HlsLevel[] {
            return hlsRef.current?.levels ?? [];
        },
        setQuality(levelIndex: number) {
            if (hlsRef.current) {
                hlsRef.current.currentLevel = levelIndex;
            }
        },
        get currentQuality(): number {
            return hlsRef.current?.currentLevel ?? -1;
        },
    };
}
