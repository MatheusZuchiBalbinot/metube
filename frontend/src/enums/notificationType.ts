export const NotificationType = {
    COMMENT_REPLIED: 'comment_replied',
    COMMENT_LIKED: 'comment_liked',
    VIDEO_LIKED: 'video_liked',
    NEW_SUBSCRIBER: 'new_subscriber',
    VIDEO_FROM_SUBSCRIPTION: 'video_from_subscription',
    VIDEO_PROCESSED: 'video_processed',
    VIDEO_TRANSCRIPTION_STARTED: 'video_transcription_started',
    VIDEO_TRANSCRIBED: 'video_transcribed',
    VIDEO_AI_SUMMARY_READY: 'video_ai_summary_ready',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];
