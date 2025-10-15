import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { postIds } = await request.json();
    const supabase = await createServerClient();

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: 'postIds array required' }, { status: 400 });
    }

    // Verify authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Batch query for viewed status
    const { data: viewedPosts, error: viewError } = await supabase
      .from('user_post_views')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (viewError) {
      console.error('Error batch checking view status:', viewError);
      return NextResponse.json({ error: 'Failed to check view status' }, { status: 500 });
    }

    // Create a set of viewed post IDs for quick lookup
    const viewedPostIds = new Set(viewedPosts?.map(view => view.post_id) || []);

    // Create response map
    const viewedMap: Record<string, boolean> = {};
    postIds.forEach(postId => {
      viewedMap[postId] = viewedPostIds.has(postId);
    });

    return NextResponse.json({ viewed: viewedMap });
  } catch (error) {
    console.error('POST /api/posts/batch-viewed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
