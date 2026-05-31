# Refactoring Phases 7-10: Final Architecture Polish

**Status**: Planning  
**Total Effort**: 12-16 hours  
**Target**: Production-ready codebase

---

## Phase 7: Event & Listener Architecture

**Goal**: Eliminate race conditions, reduce boilerplate 30%, make flows explicit

### Current Problems
1. **Race Conditions**: `VideoPublished` dispatches 2 listeners in undefined order
   - TranscribeVideo could complete before notifications fire
   - Cache invalidation might happen before event logs
2. **Boilerplate**: 4 notification listeners are nearly identical (80+ lines)
   - `SendVideoLikedNotification`, `SendCommentLikedNotification`, etc
   - Same self-notification skip logic repeated
3. **Ambiguous Events**: `TranscriptionStatusUpdated` fires for both PROCESSING and COMPLETED
   - Listeners must check status inside the handler
   - No type safety for which state changed

### Changes Required

#### A. Split Ambiguous Events
```php
// Before: TranscriptionStatusUpdated fires for both PROCESSING and COMPLETED
event(new TranscriptionStatusUpdated($video, TranscriptionStatus::PROCESSING));
event(new TranscriptionStatusUpdated($video, TranscriptionStatus::COMPLETED));

// After: Two distinct events
event(new VideoTranscriptionStarted($video, $estimatedSeconds));
event(new VideoTranscriptionCompleted($video));
```

#### B. Reduce Notification Boilerplate
```php
// Create base trait
trait SendsQueuedNotifications {
    use Queueable;
    
    public $queue = 'notifications';
    public $delay = null;
    
    protected function shouldSkipSelfNotification(User $notifier, User $recipient): bool {
        return $notifier->id === $recipient->id;
    }
}

// Before: Each listener ~20 lines
class SendVideoLikedNotification {
    public function handle(VideoLiked $event) {
        if ($event->liker->id === $event->video->channel_id) return;
        $event->video->channel->notify(new VideoLikedNotif(...));
    }
}

// After: Each listener ~5 lines
class SendVideoLikedNotification extends Listener {
    use SendsQueuedNotifications;
    
    public function handle(VideoLiked $event) {
        if ($this->shouldSkipSelfNotification($event->liker, $event->video->channel)) return;
        $event->video->channel->notify(new VideoLikedNotif(...));
    }
}
```

#### C. Fix Race Conditions with Explicit Ordering
```php
// In AppServiceProvider boot():
// 1. Publish event
// 2. Run cache invalidation (synchronous, high priority)
// 3. Queue transcription (high priority)
// 4. Queue notifications (low priority)

Event::listen(VideoPublished::class, InvalidateVideoCache::class); // Sync, priority 1
Event::listen(VideoPublished::class, DispatchTranscribeJob::class); // Priority 2
Event::listen(VideoPublished::class, SendPublishedNotifications::class); // Priority 3

// Or use event broadcasting order:
Event::listen(VideoPublished::class, function($event) {
    // Sync: invalidate cache
    cache()->forget("video:{$event->video->vuid}");
    
    // Async: dispatch jobs
    TranscribeVideo::dispatch($event->video)->afterCommit();
    NotifySubscribers::dispatch($event->video)->delay(5)->afterCommit();
});
```

#### D. Auto-Discovery for LoggableUserEvent
```php
// Instead of:
foreach ($loggableEvents as $eventClass) {
    Event::listen($eventClass, LogUserAnalytic::class);
}

// Use attribute-based:
#[EventListener]
class LogUserAnalytic {
    public function handle(LoggableUserEvent $event) { ... }
}

// Auto-discovered via reflection in service provider
```

**Files to Create:**
- `app/Listeners/Traits/SendsQueuedNotifications.php`
- `app/Events/VideoTranscriptionStarted.php`
- `app/Events/VideoTranscriptionCompleted.php`
- `app/Listeners/TranscribeVideoListener.php`

**Files to Modify:**
- `app/Events/TranscriptionStatusUpdated.php` (deprecate)
- `app/Events/VideoPublished.php` (add previousStatus)
- All 4 notification listeners (use trait)
- `app/Providers/AppServiceProvider.php` (explicit ordering)

---

## Phase 8: Query Scope Extraction

**Goal**: Move inline queries to model scopes, improve reusability

### Current State
```php
// CommentService line 30-43: Inline query
$paginator = Comment::with('user')
    ->where('video_id', $video->id)
    ->whereNull('parent_id')
    ->orderByDesc('created_at')
    ->paginate(20);

// RecommendationService line 74-83: Inline query
$events = UserAnalytic::query()
    ->where('user_id', $userId)
    ->where('occurred_at', '>=', now()->subDays(30))
    ->get();
```

### Target State
```php
// Model scopes (reusable, testable, readable)
$paginator = Comment::topLevel($video->id)->paginate(20);
$events = UserAnalytic::recentDays(30)->forUser($userId)->get();

// Model code
class Comment extends Model {
    public function scopeTopLevel($query, $videoId) {
        return $query->where('video_id', $videoId)
            ->whereNull('parent_id');
    }
}

class UserAnalytic extends Model {
    public function scopeRecentDays($query, $days = 30) {
        return $query->where('occurred_at', '>=', now()->subDays($days));
    }
    
    public function scopeForUser($query, $userId) {
        return $query->where('user_id', $userId);
    }
}
```

**Files to Create:**
- (None - only modify existing models)

**Files to Modify:**
- `app/Models/Comment.php` (add topLevel, published scopes)
- `app/Models/UserAnalytic.php` (add recentDays, forUser scopes)
- `app/Services/CommentService.php` (use scopes)
- `app/Services/RecommendationService.php` (use scopes)

---

## Phase 9: Controller Architecture (NEW)

**Goal**: Thin controllers, explicit authorization, consistent patterns

### Current State
- Controllers are already fairly thin after Phase 3 refactoring
- Some mixed responsibilities (authorization + response formatting)
- Manual authorization in some places, implicit in others

### Target Improvements

#### A. Explicit Authorization Everywhere
```php
// Pattern: authorize first, then operate
public function destroy(string $vuid): Response {
    $video = $this->videoService->getVideoByUuid($vuid);
    $this->authorize('delete', $video); // Explicit
    
    $this->uploadService->deleteVideo($video);
    return $this->noContent();
}
```

#### B. Consistent Response Pattern
```php
// All responses use Resources
public function index(Request $request): JsonResponse {
    $videos = $this->videoService->listVideos($request->all());
    return $this->json(VideoResource::collection($videos));
}

public function store(StoreVideoRequest $request): JsonResponse {
    $video = $this->uploadService->createVideo(
        auth()->user(),
        $request->getDTO() // Using getDTO() from Phase 2
    );
    return $this->json(new VideoResource($video), 202);
}
```

#### C. Form Request Pattern
```php
// All form requests have getDTO() factory
public function update(UpdateVideoRequest $request, string $vuid): JsonResponse {
    $video = $this->videoService->getVideoByUuid($vuid);
    $this->authorize('update', $video);
    
    $updated = $this->publishingService->updateVideo(
        $video,
        $request->getDTO() // Strongly typed
    );
    return $this->json(new VideoResource($updated->load('channel')));
}
```

**Changes:**
- Add authorization gates to: acceptSuggestion, dismissSuggestion, retryTranscription
- Ensure all endpoints use Resources consistently
- Verify all input uses FormRequest::getDTO()

**Files to Modify:**
- `app/Policies/VideoPolicy.php` (add missing gates)
- `app/Http/Controllers/VideoController.php` (verify patterns)
- `app/Http/Controllers/CommentController.php` (ensure consistency)
- `app/Http/Controllers/PlaylistController.php` (ensure consistency)

---

## Phase 10: Eloquent Best Practices (NEW)

**Goal**: Leverage Eloquent features, reduce raw queries, improve maintainability

### Current State
- Mix of query builders and raw queries
- Some N+1 risks in listing endpoints
- Inconsistent eager loading

### Target Improvements

#### A. Eager Loading Strategy
```php
// Pattern: Always eager load relationships needed for response
public function getVideoByUuid(string $vuid): Video {
    return $this->cache->rememberVideoMeta(
        $vuid,
        fn () => Video::with('channel:id,name,uuid')  // Only needed fields
            ->with('transcription:id,video_id,status,language,content')
            ->where('vuid', $vuid)
            ->firstOrFail()
    );
}

// List views: eager load for response
public function listVideos(array $filters): LengthAwarePaginator {
    return Video::with('channel:id,name')
        ->filter($filters)
        ->published()
        ->paginate(PaginationSize::VIDEO_LIST);
}
```

#### B. Use Model Accessors for Computed Data
```php
// Instead of in service:
$summary = $aiService->getSummary($video);

// Use model accessor:
class Video extends Model {
    public function getSummaryAttribute(): VideoSummaryDTO {
        return $this->cache->rememberVideoSummary(
            $this->vuid,
            fn () => $this->summary ? VideoSummaryDTO::fromModel($this->summary) 
                                    : VideoSummaryDTO::empty()
        );
    }
}

// In controller:
return $this->json(new VideoSummaryResource($video->summary));
```

#### C. Consolidate Common Queries into Scopes
```php
// Pattern: Named scopes for common filters
Video::published()->with('channel')->paginate();
Comment::topLevel($videoId)->published()->get();
UserAnalytic::recentDays(30)->forUser($userId)->get();

// Chaining scopes for complex queries:
$video = Video::with('channel', 'transcription', 'summary')
    ->published()
    ->where('vuid', $vuid)
    ->firstOrFail();
```

#### D. Use Collections Responsibly
```php
// Avoid: Loading full collection for filtering
$comments = Comment::where('video_id', $id)->get();
$recent = $comments->where('created_at', '>=', now()->subDays(7))->get();

// Do: Filter at database level
$recent = Comment::where('video_id', $id)
    ->where('created_at', '>=', now()->subDays(7))
    ->get();
```

**Files to Modify:**
- `app/Models/Video.php` (add summary accessor)
- `app/Services/VideoService.php` (add eager loading)
- `app/Services/CommentService.php` (use scopes)
- `app/Http/Controllers/VideoController.php` (leverage accessors)

---

## Summary: Phases 7-10

| Phase | Focus | Effort | Impact | Status |
|-------|-------|--------|--------|--------|
| **7** | Events & Listeners | 4-5h | -30% boilerplate, -Race conditions | 🟡 Ready |
| **8** | Query Scopes | 2-3h | +Reusability, +Testability | 🟡 Ready |
| **9** | Controllers | 2-3h | +Consistency, +Clarity | 🟡 Ready |
| **10** | Eloquent Patterns | 4-5h | +Performance, +Simplicity | 🟡 Ready |

---

## Implementation Order

```
Phase 7 → Phase 8 → Phase 9 → Phase 10
  ↓        ↓        ↓        ↓
Events   Scopes   Auth    Eloquent
```

Each phase builds on the previous but can be done independently.

---

**Grand Total After All 10 Phases:**
- ✅ Centralized configuration
- ✅ Type-safe DTOs everywhere
- ✅ 5 focused services
- ✅ Standardized responses
- ✅ Clear validation rules
- ✅ Safe event flows
- ✅ Reusable query scopes
- ✅ Consistent controllers
- ✅ Eloquent best practices
- ✅ **Clean, maintainable, production-ready codebase**
