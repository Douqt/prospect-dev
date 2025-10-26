import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { addIndexedFilter, updateCommunityStats } from '@/lib/pagination';
import { CommunityCache } from '@/lib/cache';

/**
 * Action type for community stats update
 */
export type CommunityAction = 'follow' | 'unfollow' | 'post';

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
export async function POST(request: NextRequest) {
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

    if (!action || !['follow', 'unfollow', 'post'].includes(action)) {
      return NextResponse.json({
        error: 'Valid action (follow, unfollow, or post) is required'
      }, { status: 400 });
    }

    const lowerSymbol = community_symbol.toLowerCase();

    try {
      // Use direct RPC call with service role
      let rpcFunction = '';
      if (action === 'post') {
        rpcFunction = 'increment_post_count';
      } else {
        rpcFunction = action === 'follow' ? 'increment_member_count' : 'decrement_member_count';
      }

      const rpcResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${rpcFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({
          community_sym: lowerSymbol
        }),
      });

      if (!rpcResponse.ok) {
        const errorData = await rpcResponse.text();
        console.error('RPC call failed:', rpcResponse.status, errorData);
        throw new Error(`RPC call failed: ${rpcResponse.status}`);
      }

      // Get updated stats
      const { data: updatedStats, error: fetchError } = await supabase
        .from('community_stats')
        .select('member_count, post_count')
        .eq('community_symbol', lowerSymbol)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching updated stats:', fetchError);
      }

      // Invalidate cache for this community
      CommunityCache.invalidateCommunityCache(lowerSymbol);

      const response: UpdateCommunityStatsResponse = {
        success: true,
        members: updatedStats?.member_count || 0,
        posts: updatedStats?.post_count || 0
      };

      return NextResponse.json(response);
    } catch (updateError) {
      console.error('Error updating community stats:', updateError);
      return NextResponse.json({
        error: 'Failed to update community stats',
        details: updateError instanceof Error ? updateError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Update community stats API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
