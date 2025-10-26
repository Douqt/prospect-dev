import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserCommunities } from '@/lib/pagination';
import { CommunityCache } from '@/lib/cache';

/**
 * Response structure for user communities API
 */
export interface UserCommunitiesResponse {
  communities: any[];
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
}

/**
 * GET handler for user communities API
 * Returns user's followed communities with optimized queries and cursor pagination
 * Uses primary key (user_id, community_symbol) for fast lookups
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
    const cacheOptions = { pagination: { limit, cursor, direction } };
    const cachedResult = CommunityCache.getUserCommunities(user.id, cacheOptions);

    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // Use optimized query function
    const result = await getUserCommunities(supabase, user.id, {
      pagination: {
        limit,
        cursor,
        direction
      }
    });

    // Transform data for response
    const response: UserCommunitiesResponse = {
      communities: result.data.map(community => ({
        symbol: community.community_symbol,
        followed_at: community.followed_at,
        member_count: community.community_stats?.member_count || 0,
        post_count: community.community_stats?.post_count || 0,
        last_activity: community.community_stats?.last_activity || null
      })),
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
      hasMore: result.hasMore
    };

    // Cache the result for future requests
    CommunityCache.setUserCommunities(user.id, { pagination: { limit, cursor, direction } }, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('User communities API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch user communities',
      communities: [],
      hasMore: false
    }, { status: 500 });
  }
}
