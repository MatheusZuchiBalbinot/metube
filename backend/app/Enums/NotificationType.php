<?php

namespace App\Enums;

enum NotificationType: string
{
    case COMMENT_REPLIED = 'comment_replied';
    case COMMENT_LIKED = 'comment_liked';
    case VIDEO_LIKED = 'video_liked';
    case NEW_SUBSCRIBER = 'new_subscriber';
    case VIDEO_FROM_SUBSCRIPTION = 'video_from_subscription';
}
