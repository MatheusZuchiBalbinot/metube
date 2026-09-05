<?php

declare(strict_types=1);

namespace App\Support;

enum ToggleOutcome
{
    case Removed;
    case NoOp;
    case Applied;
}
