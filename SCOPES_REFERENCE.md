# Model Scopes Reference

**Quick guide to all available Eloquent scopes for cleaner, more readable queries.**

---

## Video Scopes

```php
Video::published()                    // status = PUBLISHED
Video::byStatus($status)              // status = $status (DRAFT, PUBLISHED, SCHEDULED)
Video::filter($filters)               // Complex filtering (search, tags, status)
Video::newestPublished()              // Sort by published_at DESC
Video::ofChannel($channelId)          // channel_id = $channelId
Video::orderByPublished()             // Sort by published_at DESC
Video::publishedOn($date)             // published_at on specific date
Video::scheduledDue()                 // status = SCHEDULED AND scheduled_at <= now()

// Examples
Video::published()->ofChannel(5)->orderByPublished()->paginate()
Video::published()->publishedOn('2026-05-31')->get()
Video::scheduledDue()->update(['status' => PUBLISHED])
```

---

## User Scopes

```php
User::byUuid($uuid)                   // uuid = $uuid
User::recent($days = 30)              // created_at >= now() - $days
User::active($days = 7)               // updated_at >= now() - $days

// Examples
User::recent(7)->active()->get()
$user = User::byUuid('some-uuid')->first()
```

---

## Comment Scopes

```php
Comment::forVideo($videoId)           // video_id = $videoId
Comment::topLevel()                   // parent_id IS NULL
Comment::byUser($userId)              // user_id = $userId
Comment::repliesTo($parentId)         // parent_id = $parentId
Comment::newest()                     // Sort by created_at DESC

// Examples
Comment::forVideo($videoId)->topLevel()->newest()->paginate()
Comment::byUser(auth()->id())->newest()->get()
Comment::forVideo($videoId)->topLevel()->with('user')->get()
```

---

## Playlist Scopes

```php
Playlist::ofUser($userId)             // user_id = $userId
Playlist::newest()                    // Sort by created_at DESC
Playlist::recent($days = 30)          // created_at >= now() - $days

// Examples
Playlist::ofUser(auth()->id())->newest()->get()
Playlist::ofUser($userId)->recent(7)->get()
```

---

## Chaining Examples

```php
// Complex query: Published videos from channel 5, sorted by date, paginated
Video::published()
  ->ofChannel(5)
  ->orderByPublished()
  ->with('channel')
  ->paginate(15);

// Comments: Top-level comments on video, newest first, with authors loaded
Comment::forVideo($videoId)
  ->topLevel()
  ->newest()
  ->with('user')
  ->paginate(20);

// Playlists: User's recent playlists, newest first
Playlist::ofUser(auth()->id())
  ->recent(30)
  ->newest()
  ->with('videos')
  ->get();

// Active users from the last 7 days
User::active(7)
  ->orderByDesc('updated_at')
  ->get();
```

---

## Adding New Scopes

When adding logic that will be used in multiple places, create a scope:

```php
// Good: Reusable scope in model
public function scopeOfChannel(Builder $query, int $channelId): Builder
{
    return $query->where('channel_id', $channelId);
}

// Usage
Video::ofChannel(5)->get();
Video::ofChannel(5)->published()->get();

// Don't: Duplicate logic in services
// Instead of:
Video::where('channel_id', $channelId)->where('status', 'published')->get();
// Use:
Video::ofChannel($channelId)->published()->get();
```

---

## Benefits

- ✅ Readable: Intent is clear at a glance
- ✅ Reusable: Same scope used across controllers, services, tests
- ✅ Chainable: Build complex queries with multiple scopes
- ✅ Testable: Easy to test scope logic in model tests
- ✅ Maintainable: Query patterns centralized in models, not spread across codebase
