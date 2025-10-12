import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Verify authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category, image_url, action } = body;

    if (action === 'create') {
      if (!title || !content || !category) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Create discussion
      const { data: discussion, error } = await supabase
        .from('discussions')
        .insert({
          title,
          content,
          category,
          user_id: user.id,
          image_url
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating discussion:', error);
        return NextResponse.json({ error: 'Failed to create discussion' }, { status: 500 });
      }

      return NextResponse.json({ discussion });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Discussions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!category) {
      return NextResponse.json({ error: 'Category required' }, { status: 400 });
    }

    // Get discussions with counts
    const { data, error } = await supabase
      .from('discussions')
      .select(`
        id,
        title,
        content,
        user_id,
        image_url,
        category,
        created_at,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching discussions:', error);
      return NextResponse.json({ error: 'Failed to fetch discussions' }, { status: 500 });
    }

    // Add comment and vote counts
    const discussionsWithCounts = await Promise.all(
      data.map(async (discussion: { id: string; [key: string]: unknown }) => {
        const [commentsCount, votesCount] = await Promise.all([
          supabase.from('comments').select('id', { count: 'exact', head: true }).eq('discussion_id', discussion.id),
          supabase.from('discussion_votes').select('vote_type', { count: 'exact' }).eq('discussion_id', discussion.id)
        ]);

          const votes = { up: 0, down: 0 };
          votesCount.data?.forEach((vote: { vote_type: string; count: number }) => {
            if (vote.vote_type === 'up') votes.up = vote.count;
            if (vote.vote_type === 'down') votes.down = vote.count;
          });

        return {
          ...discussion,
          _count: {
            comments: commentsCount.count || 0,
            votes
          }
        };
      })
    );

    return NextResponse.json({ discussions: discussionsWithCounts });
  } catch (error) {
    console.error('GET discussions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
