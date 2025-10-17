import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { addIndexedFilter } from '@/lib/pagination';

export async function GET(
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

    // Check if user has viewed this post with indexed filter
    let viewQuery = supabase
      .from('user_post_views')
      .select('id');

    viewQuery = addIndexedFilter(viewQuery, 'user_post_views', {
      user_id: user.id,
      post_id: postId
    });

    const { data: viewData, error: viewError } = await viewQuery.single();

    if (viewError && viewError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking view status:', viewError);
      return NextResponse.json({ error: 'Failed to check view status' }, { status: 500 });
    }

    // Return boolean indicating if post has been viewed
    const hasViewed = !!viewData;

    return NextResponse.json({ viewed: hasViewed });
  } catch (error) {
    console.error('GET /api/posts/[postId]/viewed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
