import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { addIndexedFilter } from '@/lib/pagination';

// API endpoint to get top communities based on weighted score
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forumType = searchParams.get('forumType') || 'all';
  const limit = parseInt(searchParams.get('limit') || '5');

  try {
    const supabase = await createServerClient();

    // Get all communities with their stats
    const { data: communities, error } = await supabase
      .from('community_stats')
      .select('community_symbol, member_count, post_count, last_activity');

    if (error) {
      console.error('Error fetching community stats:', error);
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
    }

    if (!communities || communities.length === 0) {
      return NextResponse.json([]);
    }

    // Filter by forum type if specified
    let filteredCommunities = communities;
    if (forumType !== 'all') {
      // This is a simple filter - in a real app you might have a forum_type column
      // For now, we'll filter based on common symbols for each type
      const stockSymbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META'];
      const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC'];
      const futuresSymbols = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'GC', 'SI'];

      switch (forumType) {
        case 'stocks':
          filteredCommunities = communities.filter(c => stockSymbols.includes(c.community_symbol));
          break;
        case 'crypto':
          filteredCommunities = communities.filter(c => cryptoSymbols.includes(c.community_symbol));
          break;
        case 'futures':
          filteredCommunities = communities.filter(c => futuresSymbols.includes(c.community_symbol));
          break;
      }
    }

    // Calculate weighted scores and sort
    const communitiesWithScores = filteredCommunities
      .map(community => {
        const members = community.member_count || 0;
        const posts = community.post_count || 0;

        // Weighted score: 60% members + 40% posts
        const score = (members * 0.6) + (posts * 0.4);

        return {
          ...community,
          score,
          members,
          posts
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Return community data without price information
    const results = communitiesWithScores.map((community) => ({
      symbol: community.community_symbol,
      score: community.score,
      posts: community.posts.toString(),
      members: community.members >= 1000000 ? `${(community.members / 1000000).toFixed(1)}M` :
               community.members >= 1000 ? `${(community.members / 1000).toFixed(1)}K` :
               community.members.toString()
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Top communities API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch top communities'
    }, { status: 500 });
  }
}
