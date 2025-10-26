import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserCommunities } from '@/lib/pagination';
import { CommunityCache } from '@/lib/cache';
import memoryCache from '@/lib/cache';

/**
 * Cache invalidation helper for followed discussions
 * Clears relevant caches when community data changes
 */
async function invalidateFollowedDiscussionsCache(userId: string): Promise<void> {
  // Clear all cache entries for this user's followed discussions
  // Since we don't have a direct method, we'll clear the memory cache
  // In a production system, you'd want more granular cache keys
  memoryCache.clear();
}

/**
 * Response structure for followed discussions API
 */
export interface FollowedDiscussionsResponse {
  discussions: any[];
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
  communities: string[];
}

/**
 * GET handler for followed discussions API
 * Fetches discussions from all user's followed communities
 * Combines posts from multiple communities and sorts by creation date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Safely parse URL with error handling
    let searchParams;
    try {
      const url = new URL(request.url)
      searchParams = url.searchParams
    } catch (urlError) {
      console.error('Failed to parse request URL:', urlError)
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 })
    }
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50
    const cursor = searchParams.get('cursor');
    const direction = (searchParams.get('direction') || 'next') as 'next' | 'prev';

    // Try cache first for instant response
    const cacheKey = `followed_discussions:${user.id}:${limit}:${cursor || 'start'}:${direction}`;
    const cachedResult = memoryCache.get(cacheKey);

    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // Get user's followed communities
    const communitiesResult = await getUserCommunities(supabase, user.id, {
      pagination: { limit: 100 } // Get up to 100 communities
    });

    

    if (!communitiesResult.data || communitiesResult.data.length === 0) {
      return NextResponse.json({
        discussions: [],
        hasMore: false,
        communities: []
      });
    }

    const communitySymbols = communitiesResult.data.map(c => c.community_symbol);

    // Fetch discussions from all followed communities
    // Use a more efficient approach by fetching in batches
    const discussionsPromises = communitySymbols.map(async (symbol) => {
      try {
        const { data, error } = await supabase
          .from('discussions')
          .select(`
            id,
            title,
            content,
            user_id,
            image_url,
            category,
            created_at,
            upvotes,
            downvotes,
            comment_count,
            views,
            profiles:user_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('category', symbol.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / communitySymbols.length) + 5); // Distribute limit across communities

        if (error) {
          console.error(`Error fetching discussions for ${symbol}:`, error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error(`Error fetching discussions for ${symbol}:`, error);
        return [];
      }
    });

    const discussionsArrays = await Promise.all(discussionsPromises);
    

    // Combine all discussions and sort by creation date
    const allDiscussions = discussionsArrays.flat();

    // Sort by creation date (newest first)
    allDiscussions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply cursor pagination if provided
    let filteredDiscussions = allDiscussions;
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (direction === 'next') {
        filteredDiscussions = allDiscussions.filter(d => new Date(d.created_at) < cursorDate);
      } else {
        filteredDiscussions = allDiscussions.filter(d => new Date(d.created_at) > cursorDate);
      }
    }

    // Take the requested number of items
    const hasMore = filteredDiscussions.length > limit;
    const paginatedDiscussions = filteredDiscussions.slice(0, limit);

    // Enrich discussions with engagement counts
    const discussionsWithCounts = paginatedDiscussions.map((discussion) => ({
      ...discussion,
      _count: {
        comments: discussion.comment_count || 0,
        votes: {
          up: discussion.upvotes || 0,
          down: discussion.downvotes || 0,
        },
      },
    }));

    // Determine next/prev cursors
    const nextCursor = hasMore && discussionsWithCounts.length > 0
      ? discussionsWithCounts[discussionsWithCounts.length - 1].created_at
      : null;
    const prevCursor = discussionsWithCounts.length > 0
      ? discussionsWithCounts[0].created_at
      : null;

    const response: FollowedDiscussionsResponse = {
      discussions: discussionsWithCounts,
      nextCursor,
      prevCursor,
      hasMore,
      communities: communitySymbols
    };

    // Cache the result for future requests (shorter TTL since it combines multiple communities)
    memoryCache.set(cacheKey, response, 180); // 3 minute cache for combined results

    return NextResponse.json(response);
  } catch (error) {
    console.error('Followed discussions API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch followed discussions',
      discussions: [],
      hasMore: false,
      communities: []
    }, { status: 500 });
  }
}
