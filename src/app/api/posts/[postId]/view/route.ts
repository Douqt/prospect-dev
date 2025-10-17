import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { addIndexedFilter } from '@/lib/pagination';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const postId = (await params).postId;
    const supabase = await createServerClient();

    // Verify authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check if post exists with indexed filter
    let postQuery = supabase
      .from('discussions')
      .select('id, views, user_id');

    postQuery = addIndexedFilter(postQuery, 'discussions', { id: postId });

    const { data: post, error: postError } = await postQuery.single();

    if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 2. Check if user has already viewed this post
    const { data: existingView, error: viewCheckError } = await supabase
    .from('user_post_views')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

    if (viewCheckError) {
    console.error('Error checking existing view:', viewCheckError);
    return NextResponse.json({ error: 'Failed to check views' }, { status: 500 });
    }

    // 3. If user has NOT viewed, record view + increment counter
    if (!existingView) {
    const { error: insertError } = await supabase
        .from('user_post_views')
        .insert({
        user_id: user.id,
        post_id: postId,
        viewed_at: new Date().toISOString(),
        });

    if (insertError) {
        console.error('Error recording view:', insertError);
        return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
    }

    // Increment the view count atomically
    const { error: updateError } = await supabase.rpc('increment_view_count', { post_id: postId });

    if (updateError) {
        console.error('Error incrementing view count:', updateError);
        return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 });
    }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/posts/[postId]/view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
