import type { AiSuggestion } from '@api/videos';

function isPending(s: AiSuggestion): boolean {
    return s.status === 'pending';
}

function isAccepted(s: AiSuggestion): boolean {
    return s.status === 'accepted';
}

function isDismissed(s: AiSuggestion): boolean {
    return s.status === 'dismissed';
}

export const aiSuggestion = { isPending, isAccepted, isDismissed };
