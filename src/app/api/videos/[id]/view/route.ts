import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const videoId = params.id;

    // Verify user authentication (optional for views)
    const { data: { user } } = await supabase.auth.getUser();

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

    // Insert or update view record
    const { error: viewError } = await supabase
      .from('video_views')
      .upsert({
        user_id: user?.id || null,
        video_id: videoId,
        watched_at: new Date().toISOString(),
        watch_duration: 0,
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }, {
        onConflict: 'user_id,video_id'
      });

    if (viewError) {
      console.error('Error recording view:', viewError);
      // Don't return error for view tracking failures
    }

    // Increment view count using the database function
    const { error: incrementError } = await supabase.rpc('increment_video_views', {
      video_id_param: videoId
    });

    if (incrementError) {
      console.error('Error incrementing view count:', incrementError);
      // Don't return error for view tracking failures
    }

    return NextResponse.json({
      success: true,
      message: 'View recorded successfully'
    });

  } catch (error) {
    console.error('Error in video view API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
