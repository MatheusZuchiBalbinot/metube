<?php

declare(strict_types=1);

namespace App\Enums;

enum NotificationType: string
{
    case COMMENT_REPLIED = 'comment_replied';
    case COMMENT_LIKED = 'comment_liked';
    case VIDEO_LIKED = 'video_liked';
    case NEW_SUBSCRIBER = 'new_subscriber';
    case VIDEO_FROM_SUBSCRIPTION = 'video_from_subscription';
    case VIDEO_PROCESSED = 'video_processed';
    case VIDEO_TRANSCRIPTION_STARTED = 'video_transcription_started';
    case VIDEO_TRANSCRIBED = 'video_transcribed';
    case VIDEO_AI_SUMMARY_READY = 'video_ai_summary_ready';
}
