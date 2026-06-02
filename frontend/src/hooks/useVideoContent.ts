import { useState, useEffect } from 'react';
import { video as videoApi, toVuid } from '@api';
import type { VideoSummary, VideoTranscription } from '@api';
import { VideoStatus } from '@models';
import { getEcho } from '@lib/echo';

interface UseVideoContentResult {
    summary: VideoSummary | null
    transcription: VideoTranscription | null
    setTranscription: React.Dispatch<React.SetStateAction<VideoTranscription | null>>
}

export function useVideoContent(id: string | undefined, videoStatus: VideoStatus | undefined): UseVideoContentResult {
    const [summary, setSummary] = useState<VideoSummary | null>(null);
    const [transcription, setTranscription] = useState<VideoTranscription | null>(null);

    useEffect(() => {
        const isVideoReady = id !== undefined && videoStatus !== undefined;

        if (!isVideoReady) {
            return;
        }

        const hasContent = videoStatus === VideoStatus.PUBLISHED
            || videoStatus === VideoStatus.SCHEDULED
            || videoStatus === VideoStatus.DRAFT;

        if (!hasContent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSummary(null);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTranscription(null);
            return;
        }

        const vuid = toVuid(id);
        videoApi.getSummary(vuid).then(r => setSummary(r.ok ? r.data : null));
        videoApi.getTranscription(vuid).then(r => setTranscription(r.ok ? r.data : null));
    }, [id, videoStatus]);

    // While the transcription is done but the AI summary hasn't arrived yet, poll
    // for it so the "generating summary" indicator resolves on its own once ready.
    useEffect(() => {
        const isTranscriptionDone = transcription?.status === 'completed';
        const shouldPoll = id !== undefined && isTranscriptionDone && summary === null;

        if (!shouldPoll) {
            return;
        }

        const vuid = toVuid(id);
        let attempts = 0;
        const MAX_ATTEMPTS = 40; // ~3.3 min at 5s intervals

        function poll() {
            attempts += 1;

            if (attempts > MAX_ATTEMPTS) {
                clearInterval(interval);
                return;
            }

            void videoApi.getSummary(vuid).then(r => {
                if (r.ok && r.data !== null) {
                    setSummary(r.data);
                    clearInterval(interval);
                }
            });
        }

        const interval = setInterval(poll, 5000);

        return () => clearInterval(interval);
    }, [id, transcription?.status, summary]);

    useEffect(() => {
        const isIdReady = id !== undefined;

        if (!isIdReady) {
            return;
        }

        let isCancelled = false;

        void getEcho().then(echo => {
            if (isCancelled || echo === null) {
                return;
            }

            const ch = echo.channel(`videos.${id}`);

            const refetchTranscription = (): void => {
                void videoApi.getTranscription(toVuid(id)).then(result => {
                    setTranscription(result.ok ? result.data : null);
                });
            };

            ch.listen('.TranscriptionStatusUpdated', refetchTranscription);
            ch.listen('.VideoTranscriptionCompleted', refetchTranscription);

            ch.listen('.AiSuggestionReady', () => {
                void videoApi.getSummary(toVuid(id)).then(r => setSummary(r.ok ? r.data : null));
            });
        });

        return () => {
            isCancelled = true;
            void getEcho().then(echo => echo?.leaveChannel(`videos.${id}`));
        };
    }, [id]);

    return { summary, transcription, setTranscription };
}
