import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { community_symbol, action } = body;

    if (!community_symbol) {
      return NextResponse.json({ error: 'Community symbol required' }, { status: 400 });
    }

    const upperSymbol = community_symbol.toUpperCase();

    // Get current stats or create default
    const { data: currentStats, error: fetchError } = await supabase
      .from('community_stats')
      .select('member_count, post_count')
      .eq('community_symbol', upperSymbol)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching current stats:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch current stats' }, { status: 500 });
    }

    let newMemberCount = currentStats?.member_count || 0;
    let newPostCount = currentStats?.post_count || 0;

    // Update member count based on action
    if (action === 'follow') {
      newMemberCount += 1;
    } else if (action === 'unfollow') {
      newMemberCount = Math.max(0, newMemberCount - 1); // Don't go below 0
    }

    // For post count, we'll need to count from discussions (can't easily track this)
    const { count: postsCount, error: postsError } = await supabase
      .from('discussions')
      .select('id', { count: 'exact' })
      .eq('category', community_symbol.toLowerCase());

    if (postsError) {
      console.error('Error fetching posts count:', postsError);
      return NextResponse.json({ error: 'Failed to fetch post count' }, { status: 500 });
    }

    newPostCount = postsCount || 0;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // server only!
    );

    // Update community stats with new counts
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

    console.log(`Updated stats for ${upperSymbol}: ${newMemberCount} members, ${newPostCount} posts`);

    if (upsertError) {
      console.error('Error updating community stats:', upsertError);
      return NextResponse.json({ error: 'Failed to update community stats' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      members: newMemberCount,
      posts: newPostCount
    });

  } catch (error) {
    console.error('Update community stats API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
