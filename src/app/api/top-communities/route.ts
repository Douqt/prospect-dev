import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Forum type for filtering communities
 */
export type ForumType = 'all' | 'stocks' | 'crypto' | 'futures';

/**
 * Community statistics data structure
 */
export interface CommunityStats {
  community_symbol: string;
  member_count: number;
  post_count: number;
  last_activity: string;
  score: number;
  members: number;
  posts: number;
}

/**
 * GET handler for top communities API
 * Returns communities ranked by weighted score (60% members + 40% posts)
 * Supports filtering by forum type (stocks, crypto, futures)
 */
export async function GET(request: NextRequest) {
  // Safely parse URL with error handling
  let searchParams;
  try {
    const url = new URL(request.url)
    searchParams = url.searchParams
  } catch (urlError) {
    console.error('Failed to parse request URL:', urlError)
    return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 })
  }
  const forumType = (searchParams.get('forumType') || 'all') as ForumType;
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20); // Max 20

  try {
    const supabase = await createServerClient();

    // Fetch all community statistics
    const { data: communities, error } = await supabase
      .from('community_stats')
      .select('community_symbol, member_count, post_count, last_activity');

    if (error) {
      console.error('Error fetching community stats:', error);
      return NextResponse.json({
        error: 'Failed to fetch communities',
        details: error.message
      }, { status: 500 });
    }

    if (!communities || communities.length === 0) {
      return NextResponse.json([]);
    }

    // Filter by forum type if specified
    let filteredCommunities = communities;
    if (forumType !== 'all') {
      // This is a simple filter - in a real app you might have a forum_type column
      // For now, we'll filter based on common symbols for each type
      const stockSymbols = ['nvda', 'aapl', 'msft', 'tsla', 'googl', 'amzn', 'meta'];
      const cryptoSymbols = ['btc', 'eth', 'ada', 'sol', 'dot', 'avax', 'matic'];
      const futuresSymbols = ['es', 'nq', 'ym', 'rty', 'cl', 'gc', 'si'];

      switch (forumType) {
        case 'stocks':
          filteredCommunities = communities.filter(c => stockSymbols.includes(c.community_symbol.toLowerCase()));
          break;
        case 'crypto':
          filteredCommunities = communities.filter(c => cryptoSymbols.includes(c.community_symbol.toLowerCase()));
          break;
        case 'futures':
          filteredCommunities = communities.filter(c => futuresSymbols.includes(c.community_symbol.toLowerCase()));
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
