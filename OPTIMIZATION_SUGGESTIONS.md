# EventChron Optimization Suggestions

## Priority 1: Partial Activity Updates (CRITICAL - Highest Impact)

### Current Problem
- Every activity start/stop sends ALL activities to the API
- API deletes ALL activities and recreates them
- For 18 activities: 18 deletes + 18 creates = 36 database operations per update
- Network payload grows linearly with activity count

### Solution: Update Single Activity
Create a new API endpoint: `PATCH /api/events/[id]/activities/[activityId]`

**Benefits:**
- Only 1-2 database operations per update (update or upsert)
- Minimal network payload (only changed activity)
- 10-50x faster for large events
- Reduces database load significantly

**Implementation:**
```typescript
// New API route: app/api/events/[id]/activities/[activityId]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } }
) {
  // Update only the specific activity
  const activity = await prisma.activity.update({
    where: { id: activityId, eventId: params.id },
    data: { /* only changed fields */ }
  });
}
```

**Client-side changes:**
- Modify `handleStartActivity` to send only the activity being started
- Modify `handleActivityStop` to send only the activity being stopped
- Keep full array update only for bulk operations (editing activity list)

**Estimated Impact:**
- 18 activities: 36 operations → 1 operation (36x improvement)
- 50 activities: 100 operations → 1 operation (100x improvement)

---

## Priority 2: Optimistic Updates with Background Sync

### Current Problem
- Every update waits for API response before updating UI
- Network latency blocks user interaction
- No offline capability

### Solution: Optimistic Updates (Already partially implemented)
- ✅ Already done for `handleActivityStop`
- ⚠️ Not done for `handleStartActivity`

**Enhancement:**
- Make all updates optimistic
- Queue failed updates for retry
- Show sync status indicator

**Implementation:**
```typescript
const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

// Optimistic update immediately
setEvent(optimisticEvent);

// Sync in background
updateEvent(eventId, { activities }).then(() => {
  setSyncStatus('synced');
}).catch(() => {
  setSyncStatus('error');
  // Queue for retry
});
```

---

## Priority 3: Database Indexes

### Current State
- ✅ `eventId` is indexed on Activity
- ❌ No composite index for common queries

### Recommended Indexes
```prisma
model Activity {
  // ... existing fields
  
  @@index([eventId, order])        // For ordered queries
  @@index([eventId, isCompleted])  // For finding incomplete activities
  @@index([eventId, isActive])     // For finding active activity
}
```

**Impact:**
- Faster queries for "next incomplete activity"
- Faster filtering of completed vs incomplete
- Better performance with 50+ activities

---

## Priority 4: Batch Operations

### Current Problem
- Multiple sequential API calls if user navigates quickly
- No batching of updates

### Solution: Debounce and Batch Updates
```typescript
// Debounce rapid updates
const debouncedUpdate = useMemo(
  () => debounce((activities) => updateEvent(eventId, { activities }), 500),
  [eventId]
);

// Batch multiple changes
const [pendingUpdates, setPendingUpdates] = useState<Activity[]>([]);

useEffect(() => {
  if (pendingUpdates.length > 0) {
    debouncedUpdate(pendingUpdates);
  }
}, [pendingUpdates]);
```

**Impact:**
- Reduces API calls by 50-80%
- Better for rapid navigation
- Lower server load

---

## Priority 5: Client-Side Caching

### Current Problem
- Full event reloaded on every navigation
- No caching of event data

### Solution: React Query or SWR
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: event } = useQuery({
  queryKey: ['event', eventId],
  queryFn: () => getEventById(eventId),
  staleTime: 30000, // Cache for 30 seconds
});

const updateMutation = useMutation({
  mutationFn: (data) => updateEvent(eventId, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['event', eventId]);
  },
});
```

**Benefits:**
- Automatic caching and refetching
- Background updates
- Optimistic updates built-in
- Request deduplication

---

## Priority 6: Virtual Scrolling for Activity List

### Current Problem
- All activities rendered in DOM
- Performance degrades with 50+ activities

### Solution: React Virtual or TanStack Virtual
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: activities.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Estimated row height
});
```

**Impact:**
- Only visible activities rendered
- Smooth scrolling with 100+ activities
- Lower memory usage

---

## Priority 7: WebSocket for Real-Time Updates

### Use Case
- Multiple users viewing same event
- Real-time sync across devices/tabs

### Solution: WebSocket or Server-Sent Events
```typescript
// Real-time updates when event changes
const ws = new WebSocket(`/api/events/${eventId}/ws`);

ws.onmessage = (event) => {
  const updatedEvent = JSON.parse(event.data);
  setEvent(updatedEvent);
};
```

**Impact:**
- Instant updates across all clients
- Better collaboration
- Reduced polling

---

## Priority 8: Database Query Optimization

### Current Queries
```typescript
// Current: Fetches all activities every time
const event = await prisma.event.findUnique({
  where: { id: eventId },
  include: { activities: { orderBy: { order: 'asc' } } }
});
```

### Optimized: Selective Field Loading
```typescript
// Only fetch what's needed
const event = await prisma.event.findUnique({
  where: { id: eventId },
  select: {
    id: true,
    eventName: true,
    activities: {
      select: {
        id: true,
        activityName: true,
        timeAllotted: true,
        isCompleted: true,
        isActive: true,
        // Only fetch timeSpent if needed
      },
      orderBy: { order: 'asc' }
    }
  }
});
```

**Impact:**
- 30-50% smaller payloads
- Faster queries
- Lower memory usage

---

## Priority 9: Pagination for Activity List

### For Very Large Events (100+ activities)
```typescript
// Paginate activity list in UI
const [page, setPage] = useState(0);
const pageSize = 20;
const paginatedActivities = activities.slice(
  page * pageSize,
  (page + 1) * pageSize
);
```

**Impact:**
- Better UI performance
- Faster initial load
- Manageable for very large events

---

## Priority 10: Compression

### Network Optimization
- Enable gzip/brotli compression in Next.js
- Compress JSON payloads
- Use binary formats for large data

**Next.js config:**
```javascript
// next.config.js
module.exports = {
  compress: true, // Already enabled by default in production
};
```

---

## Implementation Roadmap

### Phase 1 (Immediate - 1-2 days)
1. ✅ Partial activity updates (Priority 1)
2. ✅ Optimistic updates for start activity (Priority 2)
3. ✅ Database indexes (Priority 3)

**Expected Impact:** 10-50x performance improvement

### Phase 2 (Short-term - 1 week)
4. Batch operations (Priority 4)
5. Client-side caching (Priority 5)
6. Query optimization (Priority 8)

**Expected Impact:** 2-5x additional improvement

### Phase 3 (Medium-term - 2-4 weeks)
7. Virtual scrolling (Priority 6)
8. WebSocket (Priority 7)
9. Pagination (Priority 9)

**Expected Impact:** Better UX, scalability to 100+ activities

---

## Performance Targets

### Current Performance (18 activities)
- Start activity: ~500-1000ms
- Stop activity: ~500-1000ms
- Load event: ~200-500ms

### Target Performance (After Phase 1)
- Start activity: ~50-100ms (10x faster)
- Stop activity: ~50-100ms (10x faster)
- Load event: ~100-200ms (2-3x faster)

### Target Performance (After Phase 2)
- Start activity: ~20-50ms (20-50x faster)
- Stop activity: ~20-50ms (20-50x faster)
- Load event: ~50-100ms (4-10x faster)

---

## Monitoring & Metrics

### Add Performance Monitoring
```typescript
// Track API call times
const startTime = performance.now();
await updateEvent(eventId, data);
const duration = performance.now() - startTime;

// Log slow operations
if (duration > 1000) {
  console.warn('Slow API call:', { duration, eventId, activitiesCount });
}
```

### Metrics to Track
- API response times
- Database query times
- Client-side render times
- Error rates
- Activity count distribution

---

## Cost-Benefit Analysis

| Optimization | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Partial Updates | Medium | Very High | 1 |
| Optimistic Updates | Low | High | 2 |
| Database Indexes | Low | Medium | 3 |
| Batch Operations | Medium | Medium | 4 |
| Client Caching | Medium | High | 5 |
| Virtual Scrolling | High | Medium | 6 |
| WebSocket | High | Low | 7 |
| Query Optimization | Low | Medium | 8 |
| Pagination | Medium | Low | 9 |
| Compression | Low | Low | 10 |

---

## Quick Wins (Can implement today)

1. **Add composite index** (5 minutes)
   ```prisma
   @@index([eventId, order, isCompleted])
   ```

2. **Optimize activity queries** (15 minutes)
   - Only fetch needed fields
   - Use `select` instead of `include`

3. **Add request debouncing** (30 minutes)
   - Debounce rapid navigation
   - Batch multiple updates

4. **Enable compression** (Already enabled in production)

---

## Testing Recommendations

### Load Testing
- Test with 10, 25, 50, 100 activities
- Measure API response times
- Monitor database query performance
- Test concurrent users

### Performance Testing
- Use Chrome DevTools Performance tab
- Monitor React render times
- Track network payload sizes
- Measure time to interactive

---

## Notes

- All optimizations are backward compatible
- Can be implemented incrementally
- No breaking changes to API
- Gradual rollout recommended
