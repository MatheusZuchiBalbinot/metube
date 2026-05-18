import { useState, useEffect } from 'react';
import { video as videoApi, type Vuid, type VideoSummary, type VideoTranscription } from '@api/videos';
import { VideoStatus } from '@models/video';
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

        const isPublished = videoStatus === VideoStatus.PUBLISHED || videoStatus === VideoStatus.SCHEDULED;

        if (!isPublished) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSummary(null);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTranscription(null);
            return;
        }

        const vuid = id as unknown as Vuid;
        videoApi.getSummary(vuid).then(setSummary);
        videoApi.getTranscription(vuid).then(setTranscription);
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
                videoApi.getTranscription(id as unknown as Vuid).then(result => {
                    setTranscription(result);
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
