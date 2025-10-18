# Database Optimization Guide: Community Queries

This document outlines the database optimization strategies implemented for efficient community-related queries in the application.

## 🚀 Performance Optimizations Implemented

### 1. Primary Key Optimization
**Table**: `community_memberships`
**Primary Key**: `(user_id, community_symbol)`

```sql
-- This enables O(log N) lookups for user's communities
-- Instead of scanning the entire table
ALTER TABLE community_memberships
ADD CONSTRAINT community_memberships_pkey
PRIMARY KEY (user_id, community_symbol);
```

**Benefits**:
- Fast user community lookups
- Efficient join operations
- Prevents duplicate memberships

### 2. Secondary Index for Community User Queries
**Index**: `(community_symbol, user_id)`

```sql
-- This enables fast "all users in community" queries
CREATE INDEX idx_community_memberships_symbol_user
ON community_memberships (community_symbol, user_id);
```

**Benefits**:
- Fast community member enumeration
- Efficient reverse lookups
- Supports pagination with stable ordering

### 3. Efficient Join Queries

#### User Communities Query Pattern
```typescript
// Uses primary key for fast lookups
const result = await getUserCommunities(supabase, userId, {
  pagination: { limit: 50, cursor, direction: 'next' }
});
```

**Query Structure**:
```sql
SELECT cm.community_symbol, cm.followed_at, cs.*
FROM community_memberships cm
JOIN community_stats cs ON cs.community_symbol = cm.community_symbol
WHERE cm.user_id = $1
ORDER BY cm.followed_at DESC
LIMIT 51; -- One extra for pagination check
```

### 4. Cursor-Based Pagination

#### Implementation
```typescript
// Instead of OFFSET (which gets slower with larger datasets)
OFFSET 1000 LIMIT 20 -- SLOW: scans first 1020 rows

// Use cursor pagination (consistent performance)
WHERE followed_at < $1 ORDER BY followed_at DESC LIMIT 21 -- FAST
```

**Benefits**:
- Consistent performance regardless of dataset size
- No duplicate results during concurrent modifications
- Memory efficient for large datasets

### 5. Multi-Level Caching Strategy

#### Cache Layers
1. **In-Memory Cache** (5 minutes TTL)
   - User communities data
   - Community statistics
   - Frequent query results

2. **Database Cache** (`community_stats` table)
   - Member counts
   - Post counts
   - Last activity timestamps

#### Cache Invalidation
```typescript
// Automatic invalidation on community changes
CommunityCache.invalidateCommunityCache(communitySymbol);
CommunityCache.invalidateUserCache(userId);
```

## 📊 Performance Benchmarks

### Before Optimization
- **User Communities Query**: O(N) table scan
- **Community Stats**: Multiple COUNT queries
- **Pagination**: OFFSET-based (degrades with scale)
- **Cache**: None

### After Optimization
- **User Communities Query**: O(log N) indexed lookup
- **Community Stats**: O(1) cached lookup
- **Pagination**: O(log N) cursor-based
- **Cache**: Multi-level with 5-minute TTL

## 🔧 API Endpoints Using Optimizations

### 1. `/api/forum-stats` - Community Statistics
```typescript
GET /api/forum-stats?symbol=NVDA

// Response with caching
{
  "posts": 1250,
  "members": "15.2K"
}
```

**Optimizations Used**:
- In-memory cache (5min TTL)
- Database cache via `community_stats` table
- Indexed queries for counts

### 2. `/api/user-communities` - User's Followed Communities
```typescript
GET /api/user-communities?limit=20&cursor=2024-01-01T00:00:00Z

// Response with cursor pagination
{
  "communities": [...],
  "nextCursor": "2024-01-01T00:00:00Z",
  "prevCursor": "2023-12-31T23:59:59Z",
  "hasMore": true
}
```

**Optimizations Used**:
- Primary key indexed joins
- Cursor-based pagination
- In-memory caching
- Efficient data transformation

### 3. `/api/update-community-stats` - Community Updates
```typescript
POST /api/update-community-stats
{
  "community_symbol": "nvda",
  "action": "follow"
}

// Response
{
  "success": true,
  "members": 15250,
  "posts": 1250
}
```

**Optimizations Used**:
- Optimized update functions
- Automatic cache invalidation
- Atomic operations

### 4. `/api/followed-discussions` - Posts from Followed Forums
```typescript
GET /api/followed-discussions?limit=20&cursor=2024-01-01T00:00:00Z

// Response with posts from all followed communities
{
  "discussions": [
    {
      "id": "123",
      "title": "NVDA earnings discussion",
      "content": "...",
      "category": "nvda",
      "created_at": "2024-01-01T10:30:00Z",
      "profiles": { "username": "trader123", "avatar_url": "..." },
      "_count": { "comments": 15, "votes": { "up": 8, "down": 2 } }
    }
  ],
  "nextCursor": "2024-01-01T09:00:00Z",
  "prevCursor": "2024-01-01T10:30:00Z",
  "hasMore": true,
  "communities": ["nvda", "aapl", "tsla"]
}
```

**Optimizations Used**:
- Fetches from multiple communities efficiently
- Combines and sorts posts by creation date
- Cursor-based pagination across communities
- In-memory caching for combined results

## 🛠️ Usage Examples

### Frontend Integration
```typescript
// Fetch user communities with pagination
const fetchCommunities = async (cursor?: string) => {
  const response = await fetch(`/api/user-communities?limit=20&cursor=${cursor || ''}`);
  const data = await response.json();

  return {
    communities: data.communities,
    nextCursor: data.nextCursor,
    hasMore: data.hasMore
  };
};

// Fetch community statistics
const fetchCommunityStats = async (symbol: string) => {
  const response = await fetch(`/api/forum-stats?symbol=${symbol}`);
  return await response.json();
};

// Fetch posts from all followed forums (THE SOLUTION TO "NO POSTS")
const fetchFollowedDiscussions = async (cursor?: string) => {
  const response = await fetch(`/api/followed-discussions?limit=20&cursor=${cursor || ''}`);
  const data = await response.json();

  return {
    discussions: data.discussions,
    nextCursor: data.nextCursor,
    prevCursor: data.prevCursor,
    hasMore: data.hasMore,
    communities: data.communities // Shows which communities had posts
  };
};

// Usage in a React component
const useFollowedDiscussions = () => {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const result = await fetchFollowedDiscussions(cursor);
      setDiscussions(prev => [...prev, ...result.discussions]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  return { discussions, loading, hasMore, loadMore };
};
```

### Database Schema Requirements

Ensure your database has these optimized structures:

```sql
-- Primary key for fast user lookups
ALTER TABLE community_memberships
ADD CONSTRAINT community_memberships_pkey
PRIMARY KEY (user_id, community_symbol);

-- Secondary index for fast community lookups
CREATE INDEX idx_community_memberships_symbol_user
ON community_memberships (community_symbol, user_id);

-- Stats table for caching counts
CREATE TABLE community_stats (
  community_symbol TEXT PRIMARY KEY,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on discussions for fast post counts
CREATE INDEX idx_discussions_category_created
ON discussions (category, created_at DESC);
```

## 📈 Monitoring and Maintenance

### Cache Performance Monitoring
```typescript
// Get cache statistics
const stats = CommunityCache.getCacheStats();
console.log(`Cache size: ${stats.size}`);
```

### Database Query Performance
Monitor these query patterns:
- `community_memberships` table scans (should be minimal)
- `discussions` category filters (should use index)
- `community_stats` cache hit rate

### Scaling Considerations

For datasets > 1M records:
1. **Partitioning**: Consider partitioning `community_memberships` by date
2. **Read Replicas**: Use read replicas for stats queries
3. **Redis Cluster**: Replace in-memory cache with Redis cluster
4. **Database Sharding**: Shard by community_symbol for very large datasets

## 🚨 Troubleshooting

### Common Issues

1. **No Posts from Followed Forums**
   - **Cursor Issue**: Check if cursor is set to a date after the newest post
   - **Cache Issue**: Clear cache using `CommunityCache.clearAll()`
   - **Filter Issue**: Verify frontend isn't filtering out posts incorrectly
   - **Database Issue**: Check if user actually follows any communities

   **Debug Steps**:
   ```typescript
   // Clear all caches
   CommunityCache.clearAll();

   // Check if user follows communities
   const { data: follows } = await supabase
     .from('community_memberships')
     .select('community_symbol')
     .eq('user_id', userId);

   console.log('Followed communities:', follows);
   ```

2. **Follow Button Not Updating**
   - **Query Issue**: The button uses `maybeSingle()` for better error handling
   - **Cache Issue**: Follow status is cached for 30 seconds
   - **Primary Key Issue**: Ensure database has proper primary key constraints
   - **Optimistic Updates**: Button updates immediately but reverts on error

   **Debug Steps**:
   ```typescript
   // Check button query directly
   const { data: { user } } = await supabase.auth.getUser();
   const { data, error } = await supabase
     .from('community_memberships')
     .select('id')
     .eq('user_id', user.id)
     .eq('community_symbol', 'nvda')
     .maybeSingle();

   console.log('Follow check result:', { data, error });
   ```

2. **Slow Queries**
   - Check if indexes are being used: `EXPLAIN ANALYZE`
   - Verify primary key constraints are in place
   - Monitor cache hit rates

3. **High Memory Usage**
   - Reduce cache TTL for large datasets
   - Implement cache size limits
   - Monitor memory usage patterns

4. **Stale Data**
   - Implement proper cache invalidation
   - Use background jobs for stats recalculation
   - Monitor cache expiry patterns

### Debug API Endpoints

Test these endpoints directly to isolate issues:

```bash
# Test followed discussions endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/followed-discussions?limit=5"

# Test user communities endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/user-communities?limit=10"

# Clear cache for debugging
curl -X POST "http://localhost:3000/api/debug/clear-cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Best Practices Summary

✅ **Do**:
- Use primary keys for all relationship queries
- Implement cursor pagination for large datasets
- Cache frequently accessed data
- Use indexed filters for all WHERE clauses
- Monitor query performance regularly

❌ **Don't**:
- Use OFFSET pagination for large datasets
- Perform table scans for relationship queries
- Skip cache invalidation on data changes
- Use string concatenation for cache keys
- Ignore database index maintenance

## 📚 Additional Resources

- [Supabase Performance Guide](https://supabase.com/docs/guides/performance)
- [PostgreSQL Indexing Strategies](https://www.postgresql.org/docs/current/indexes.html)
- [Cursor Pagination Best Practices](https://use-the-index-luke.com/blog/2019-10-09/cursor-pagination)

---

*This optimization guide ensures your community features scale efficiently from hundreds to millions of users while maintaining sub-second response times.*
