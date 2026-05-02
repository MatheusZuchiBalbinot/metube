<?php

namespace App\Listeners;

use App\Enums\VideoEventType;
use App\Events\VideoFinished;
use App\Events\VideoReactionApplied;
use App\Events\VideoSaved;
use App\Events\VideoViewed;
use App\Models\UserAnalytic;

class LogUserAnalytic
{
    /**
     * Handle an incoming video interaction event.
     */
    public function handle(VideoViewed|VideoReactionApplied|VideoSaved|VideoFinished $event): void
    {
        $type = match (true) {
            $event instanceof VideoViewed => VideoEventType::VIEW,
            $event instanceof VideoReactionApplied => $event->type,
            $event instanceof VideoSaved => VideoEventType::SAVE,
            $event instanceof VideoFinished => VideoEventType::FINISH,
        };

        UserAnalytic::create([
            'user_id' => $event->user->id,
            'video_id' => $event->video->id,
            'event_type' => $type,
        ]);
    }
}
