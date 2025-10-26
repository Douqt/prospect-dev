import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Safely parse URL with error handling
    let searchParams;
    try {
      const url = new URL(request.url)
      searchParams = url.searchParams
    } catch (urlError) {
      console.error('Failed to parse request URL:', urlError)
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 })
    }

    const query = searchParams.get('q') || '';
    const sortBy = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const creatorId = searchParams.get('creator') || searchParams.get('creator_id');

    // Build the query
    let dbQuery = supabase
      .from('videos')
      .select(`
        *,
        creator:profiles!videos_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        ),
        likes_count:video_likes(count),
        is_liked:video_likes!left(user_id)
      `)
      .eq('is_published', true);

    // Apply search filter
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Apply creator filter
    if (creatorId) {
      dbQuery = dbQuery.eq('creator_id', creatorId);
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        dbQuery = dbQuery.order('created_at', { ascending: true });
        break;
      case 'most_viewed':
        dbQuery = dbQuery.order('views', { ascending: false });
        break;
      case 'most_liked':
        dbQuery = dbQuery.order('likes', { ascending: false });
        break;
      case 'newest':
      default:
        dbQuery = dbQuery.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: videos, error } = await dbQuery;

    if (error) {
      console.error('Error fetching videos:', error);

      // Check if it's a table doesn't exist error
      if (error.code === '42P01' || error.message?.includes('relation "videos" does not exist')) {
        return NextResponse.json(
          {
            error: 'Database not initialized',
            message: 'The videos table has not been created yet. Please run the database migration first.',
            details: 'Run: npx supabase migration up or npx supabase db reset'
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch videos', details: error.message },
        { status: 500 }
      );
    }

    // Transform the data to match our Video interface
    const transformedVideos = videos?.map(video => ({
      ...video,
      likes: video.likes || 0,
      is_liked: video.is_liked && video.is_liked.length > 0,
      creator: video.creator
    })) || [];

    return NextResponse.json({
      videos: transformedVideos,
      count: transformedVideos.length,
      hasMore: transformedVideos.length === limit
    });

  } catch (error) {
    console.error('Error in videos API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
