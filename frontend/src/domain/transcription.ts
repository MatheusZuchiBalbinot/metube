import type { VideoTranscription } from '@api/videos';

function isProcessing(t: VideoTranscription): boolean {
    return t.status === 'pending' || t.status === 'processing';
}

function isCompleted(t: VideoTranscription): boolean {
    return t.status === 'completed';
}

function isFailed(t: VideoTranscription): boolean {
    return t.status === 'failed';
}

function hasContent(t: VideoTranscription): boolean {
    return t.content !== null && t.content.trim() !== '';
}

export const transcription = { isProcessing, isCompleted, isFailed, hasContent };
