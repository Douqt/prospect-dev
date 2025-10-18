import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { addIndexedFilter } from '@/lib/pagination';

/**
 * Action type for community stats update
 */
export type CommunityAction = 'follow' | 'unfollow';

/**
 * Request body structure for community stats update
 */
export interface UpdateCommunityStatsRequest {
  community_symbol: string;
  action: CommunityAction;
}

/**
 * Response structure for community stats update
 */
export interface UpdateCommunityStatsResponse {
  success: boolean;
  members: number;
  posts: number;
}

/**
 * POST handler for updating community statistics
 * Updates member count when users follow/unfollow communities
 * Recalculates post count from discussions table
 * Maintains community_stats table for performance
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body: UpdateCommunityStatsRequest = await request.json();
    const { community_symbol, action } = body;

    // Validate required parameters
    if (!community_symbol?.trim()) {
      return NextResponse.json({
        error: 'Community symbol is required'
      }, { status: 400 });
    }

    if (!action || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json({
        error: 'Valid action (follow or unfollow) is required'
      }, { status: 400 });
    }

    const upperSymbol = community_symbol.toUpperCase();

    // Get current stats or create default
    const { data: currentStats, error: fetchError } = await supabase
      .from('community_stats')
      .select('member_count, post_count')
      .eq('community_symbol', upperSymbol)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current stats:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch current stats',
        details: fetchError.message
      }, { status: 500 });
    }

    let newMemberCount = currentStats?.member_count || 0;
    let newPostCount = currentStats?.post_count || 0;

    // Update member count based on action
    if (action === 'follow') {
      newMemberCount += 1;
    } else if (action === 'unfollow') {
      newMemberCount = Math.max(0, newMemberCount - 1); // Don't go below 0
    }

    // Recalculate post count from discussions with indexed filter
    let postsQuery = supabase
      .from('discussions')
      .select('*', { count: 'exact', head: true });

    postsQuery = addIndexedFilter(postsQuery, 'discussions', {
      category: community_symbol.toLowerCase()
    });

    const { count: postsCount, error: postsError } = await postsQuery;

    if (postsError) {
      console.error('Error fetching posts count:', postsError);
      return NextResponse.json({
        error: 'Failed to fetch post count',
        details: postsError.message
      }, { status: 500 });
    }

    newPostCount = postsCount || 0;

    // Update community stats using admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // server only!
    );

    const { error: upsertError } = await supabaseAdmin
      .from('community_stats')
      .upsert({
        community_symbol: upperSymbol,
        member_count: newMemberCount,
        post_count: newPostCount,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'community_symbol'
      });

    if (upsertError) {
      console.error('Error updating community stats:', upsertError);
      return NextResponse.json({
        error: 'Failed to update community stats',
        details: upsertError.message
      }, { status: 500 });
    }

    const response: UpdateCommunityStatsResponse = {
      success: true,
      members: newMemberCount,
      posts: newPostCount
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Update community stats API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
