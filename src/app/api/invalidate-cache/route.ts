import { NextRequest, NextResponse } from 'next/server';
import { CommunityCache } from '@/lib/cache';

/**
 * POST handler for cache invalidation API
 * Invalidates cache for a specific community to ensure fresh data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communitySymbol } = body;

    if (!communitySymbol?.trim()) {
      return NextResponse.json({
        error: 'Community symbol is required'
      }, { status: 400 });
    }

    const lowerSymbol = communitySymbol.toLowerCase();

    // Invalidate all cache related to this community
    CommunityCache.invalidateCommunityCache(lowerSymbol);

    console.log(`Cache invalidated for community: ${lowerSymbol}`);

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for ${lowerSymbol.toUpperCase()}`
    });
  } catch (error) {
    console.error('Cache invalidation API error:', error);
    return NextResponse.json({
      error: 'Failed to invalidate cache'
    }, { status: 500 });
  }
}
