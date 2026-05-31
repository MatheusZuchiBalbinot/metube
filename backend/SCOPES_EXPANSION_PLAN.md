# Aggressive Scope Expansion Plan

**Goal**: Replace 100% of inline `where()` clauses with scopes

---

## High-Impact Scopes to Add

### Video Model
```php
// Existing: published(), byStatus(), ofChannel(), byVuid(), etc.

// Add:
->withLikeCount()        // Eager load count from pivot
->withViewCount()        // Eager load views
->withCommentCount()     // Eager load comments
->withinDays($days)      // created_at >= now()->subDays()
->trending()             // published()->orderByDesc('views')
->recent()               // orderByDesc('published_at')
```

### Comment Model  
```php
// Existing: forVideo(), topLevel(), byUser(), byCuid(), newest()

// Add:
->withLikeCount()        // Eager load like count
->published()            // Filter by current_version_id existence
->edited()               // Where current_version_id is not null
->children($parentId)    // RepliesTo, but chainable
```

### User Model
```php
// Existing: byUuid(), recent(), active()

// Add:
->withVideoCount()       // Load count of videos
->withSubscriberCount()  // Load subscriber count
->alphabetical()         // Order by name ASC
->channels()             // Filter by role='channel' or has videos
```

### Playlist Model
```php
// Existing: ofUser(), byPuid(), newest(), recent()

// Add:
->withVideoCount()       // Eager load video count
->popular()              // Order by most videos
->named($name)           // Where name ILIKE $name
```

### WatchHistory Model (Create if needed)
```php
->forUser($userId)       // Filter by user
->forVideo($videoId)     // Filter by video
->recent($days)          // By watched_at
->grouped()              // Group by date
```

### UserSubscription Model
```php
->between($user, $channel)  // Check subscription exists
->forChannel($channelId)    // Filter by channel
->forUser($userId)          // Filter by subscriber
->recent()                  // Order by created_at DESC
```

### VideoReaction Model
```php
->byUser($userId)        // Filter by user
->forVideo($videoId)     // Filter by video
->ofType($type)          // Filter by type (LIKE/DISLIKE)
->liked()                // type = LIKE
->disliked()             // type = DISLIKE
```

---

## Services to Update (Priority Order)

1. **VideoReactionService** (high impact - many where clauses)
2. **ChannelService** (subscription queries)
3. **UserService** (user queries)
4. **VideoService** (video queries)
5. **RecommendationService** (analytics)
6. **ViewCounterService** (view tracking)

---

## Implementation Strategy

1. Add scopes to models (batch)
2. Update services one-by-one
3. Replace all inline where() with scopes
4. Verify tests still pass

Target: Zero inline where() clauses in services, 100% scope usage
