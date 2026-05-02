<?php

namespace App\Enums;

enum VideoEventType: string
{
    case VIEW = 'view';
    case LIKE = 'like';
    case DISLIKE = 'dislike';
    case SAVE = 'save';
    case FINISH = 'finish';
}
