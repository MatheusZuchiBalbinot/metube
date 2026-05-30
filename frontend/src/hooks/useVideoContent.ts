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

            ch.listen('.TranscriptionStatusUpdated', () => {
                videoApi.getTranscription(toVuid(id)).then(result => {
                    setTranscription(result.ok ? result.data : null);
                });
            });
        });

        return () => {
            isCancelled = true;
            void getEcho().then(echo => echo?.leaveChannel(`videos.${id}`));
        };
    }, [id]);

    return { summary, transcription, setTranscription };
}
