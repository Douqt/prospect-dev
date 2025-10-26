import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

async function getHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const videoId = params.id;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if video exists and is published
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, is_published')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (!video.is_published) {
      return NextResponse.json(
        { error: 'Video is not published' },
        { status: 403 }
      );
    }

    // Get comments with user information and like status
    const { data: comments, error: commentsError } = await supabase
      .from('video_comments')
      .select(`
        *,
        user:profiles!video_comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        ),
        likes_count:video_comment_likes(count),
        is_liked:video_comment_likes!left(user_id)
      `)
      .eq('video_id', videoId)
      .is('parent_id', null) // Only get top-level comments
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Transform the data to match our Comment interface
    const transformedComments = comments?.map(comment => ({
      ...comment,
      likes: comment.likes || 0,
      is_liked: comment.is_liked && comment.is_liked.length > 0,
      user: comment.user
    })) || [];

    return NextResponse.json({
      comments: transformedComments,
      count: transformedComments.length,
      hasMore: transformedComments.length === limit
    });

  } catch (error) {
    console.error('Error in video comments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(getHandler, RATE_LIMITS.GENERAL);
export const POST = withRateLimit(postHandler, RATE_LIMITS.INTERACTION);

async function postHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const videoId = params.id;

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if video exists and is published
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, is_published')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (!video.is_published) {
      return NextResponse.json(
        { error: 'Video is not published' },
        { status: 403 }
      );
    }

    const { content, parent_id } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // If this is a reply, check if parent comment exists
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('video_comments')
        .select('id')
        .eq('id', parent_id)
        .eq('video_id', videoId)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    // Insert the comment
    const { data: comment, error: insertError } = await supabase
      .from('video_comments')
      .insert({
        content: content.trim(),
        user_id: user.id,
        video_id: videoId,
        parent_id: parent_id || null
      })
      .select(`
        *,
        user:profiles!video_comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        likes: 0,
        is_liked: false,
        user: comment.user
      },
      message: 'Comment posted successfully'
    });

  } catch (error) {
    console.error('Error in video comments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
