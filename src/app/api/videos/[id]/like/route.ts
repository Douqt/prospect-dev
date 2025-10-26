import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

async function handler(
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

    // Check if user already liked this video
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('video_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();

    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      console.error('Error checking existing like:', likeCheckError);
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }

    if (existingLike) {
      // User already liked, remove the like
      const { error: deleteError } = await supabase
        .from('video_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove like' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'unliked',
        message: 'Like removed successfully'
      });
    } else {
      // User hasn't liked, add the like
      const { error: insertError } = await supabase
        .from('video_likes')
        .insert({
          user_id: user.id,
          video_id: videoId
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return NextResponse.json(
          { error: 'Failed to add like' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'liked',
        message: 'Like added successfully'
      });
    }

  } catch (error) {
    console.error('Error in video like API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, RATE_LIMITS.INTERACTION);
