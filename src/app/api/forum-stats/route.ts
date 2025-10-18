import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { addIndexedFilter } from '@/lib/pagination';

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
    const upperSymbol = symbol.toUpperCase();

    // Try to get cached stats first
    const { data: communityStats, error: statsError } = await supabase
      .from('community_stats')
      .select('member_count, post_count')
      .eq('community_symbol', upperSymbol)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching community stats:', statsError);
    }

    let membersCount = communityStats?.member_count || 0;
    let postsCount = communityStats?.post_count || 0;

    // If no cached data, calculate dynamically
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

        membersQuery = addIndexedFilter(membersQuery, 'community_memberships', { community_symbol: symbol.toUpperCase() });

        const { count: membersCountResult, error: membersError } = await membersQuery;

        if (membersError) {
          console.error('Error counting members:', membersError);
        } else {
          membersCount = membersCountResult || 0;
        }

        console.log(`Dynamic counts for ${symbol.toUpperCase()}: ${membersCount} members, ${postsCount} posts`);

        // Try to populate community_stats table for future requests
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // server only!
          );

          await supabaseAdmin
            .from('community_stats')
            .upsert({
              community_symbol: symbol.toUpperCase(),
              member_count: membersCount,
              post_count: postsCount,
              last_activity: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'community_symbol'
            });

          console.log(`Populated community_stats for ${symbol.toUpperCase()}`);
        } catch (populateError) {
          console.error('Error populating community_stats:', populateError);
          // Non-critical error, continue with dynamic counts
        }
      } catch (dynamicError) {
        console.error('Error calculating dynamic counts:', dynamicError);
      }
    }



    return NextResponse.json({
      posts: postsCount || 0,
      members: membersCount ? (membersCount >= 1000000 ? `${(membersCount / 1000000).toFixed(1)}M` : membersCount >= 1000 ? `${(membersCount / 1000).toFixed(1)}K` : membersCount.toString()) : "0",
    });
  } catch (error) {
    console.error('Forum stats API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch forum stats',
      posts: 0,
      members: "0",
    }, { status: 500 });
  }
}
