import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { addIndexedFilter, getCommunityStats, updateCommunityStats } from '@/lib/pagination';
import { CommunityCache } from '@/lib/cache';

/**
 * Forum statistics response structure
 */
export interface ForumStatsResponse {
  posts: number;
  members: string;
}

/**
 * GET handler for forum statistics API
 * Returns member count and post count for a specific trading symbol
 * Uses cached data when available, falls back to dynamic calculation
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  // Validate required parameters
  if (!symbol?.trim()) {
    return NextResponse.json({
      error: 'Symbol parameter is required'
    }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const lowerSymbol = symbol.toLowerCase();

    // Try cache first for instant response
    const cacheKey = `forum_stats:${lowerSymbol}`;
    const cachedResult = CommunityCache.getCommunityStats(cacheKey);

    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // Try to get stats from community_stats table
    const communityStats = await getCommunityStats(supabase, lowerSymbol);

    let membersCount = communityStats?.member_count || 0;
    let postsCount = communityStats?.post_count || 0;

    // If no cached data, calculate dynamically using optimized functions
    if (!communityStats || (membersCount === 0 && postsCount === 0)) {
      try {
        // Count posts from discussions table with indexed filter
        let postsQuery = supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true });

        postsQuery = addIndexedFilter(postsQuery, 'discussions', { category: symbol.toLowerCase() });

        const { count: postsCountResult, error: postsError } = await postsQuery;

        if (postsError) {
          console.error('Error counting posts:', postsError);
        } else {
          postsCount = postsCountResult || 0;
        }

        // Count members from community_memberships table with indexed filter
        let membersQuery = supabase
          .from('community_memberships')
          .select('id', { count: 'exact' });

        membersQuery = addIndexedFilter(membersQuery, 'community_memberships', { community_symbol: symbol.toLowerCase() });

        const { count: membersCountResult, error: membersError } = await membersQuery;

        if (membersError) {
          console.error('Error counting members:', membersError);
        } else {
          membersCount = membersCountResult || 0;
        }

        console.log(`Dynamic counts for ${symbol.toUpperCase()}: ${membersCount} members, ${postsCount} posts`);

        // Update community_stats table for future requests using optimized function
        try {
          await updateCommunityStats(supabase, lowerSymbol, 'follow'); // This will recalculate both counts
        } catch (populateError) {
          console.error('Error updating community_stats:', populateError);
          // Non-critical error, continue with dynamic counts
        }
      } catch (dynamicError) {
        console.error('Error calculating dynamic counts:', dynamicError);
      }
    }

    // Prepare response
    const result = {
      posts: postsCount || 0,
      members: membersCount ? (membersCount >= 1000000 ? `${(membersCount / 1000000).toFixed(1)}M` : membersCount >= 1000 ? `${(membersCount / 1000).toFixed(1)}K` : membersCount.toString()) : "0",
    };

    // Cache the result for future requests
    CommunityCache.setCommunityStats(cacheKey, result, { ttl: 300 }); // 5 minute cache

    // Also invalidate cache to ensure fresh data for next request
    CommunityCache.invalidateCommunityCache(lowerSymbol);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Forum stats API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch forum stats',
      posts: 0,
      members: "0",
    }, { status: 500 });
  }
}
