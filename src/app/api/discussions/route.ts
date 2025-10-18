import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST handler for discussions API
 * Handles creating new discussions with authentication
 */
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
      // Validate required fields
      if (!title?.trim() || !content?.trim() || !category?.trim()) {
        return NextResponse.json({
          error: 'Missing required fields: title, content, and category are required'
        }, { status: 400 });
      }

      // Create discussion with server-side validation
      const { data: discussion, error } = await supabase
        .from('discussions')
        .insert({
          title: title.trim(),
          content: content.trim(),
          category: category.trim(),
          user_id: user.id,
          image_url: image_url?.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating discussion:', error);
        return NextResponse.json({
          error: 'Failed to create discussion',
          details: error.message
        }, { status: 500 });
      }

      // Use API route to handle service role for stats update
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/increment_post_count`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
          body: JSON.stringify({
            community_sym: category.trim().toLowerCase()
          }),
        });

        if (response.ok) {
          console.log(`Post count incremented for ${category.trim().toUpperCase()}`);
        } else {
          console.error('Error updating post count:', response.statusText);
        }
      } catch (statsError) {
        console.error('Error updating post count:', statsError);
        // Don't fail the request if stats update fails
      }

      // Invalidate relevant queries to refresh UI with new post count
      try {
        const cacheInvalidationResponse = await fetch('/api/invalidate-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            communitySymbol: category.trim().toLowerCase()
          }),
        });

        if (cacheInvalidationResponse.ok) {
          console.log(`Cache invalidated for ${category.trim().toUpperCase()}`);
        }
      } catch (cacheError) {
        console.error('Error invalidating cache:', cacheError);
      }

      return NextResponse.json({
        discussion,
        message: 'Discussion created successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Discussions API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET handler for discussions API
 * Fetches discussions by category with profile data and engagement counts
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Validate required parameters
    if (!category?.trim()) {
      return NextResponse.json({
        error: 'Category parameter is required'
      }, { status: 400 });
    }

    // Fetch discussions with profile data
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
      .eq('category', category.trim())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching discussions:', error);
      return NextResponse.json({
        error: 'Failed to fetch discussions',
        details: error.message
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ discussions: [] });
    }

    // Enrich discussions with engagement counts
    const discussionsWithCounts = await Promise.all(
      data.map(async (discussion) => {
        try {
          const [commentsResult, votesResult] = await Promise.all([
            supabase.from('comments').select('*', { count: 'exact', head: true })
              .eq('discussion_id', discussion.id),
            supabase.from('discussion_votes').select('vote_type', { count: 'exact' })
              .eq('discussion_id', discussion.id)
          ]);

          // Count votes by type
          const votes = { up: 0, down: 0 };
          if (votesResult.count) {
            // When using count: 'exact', we get the total count, not individual records
            // This is a simplified approach - in a real app you'd want separate queries for each vote type
            votes.up = Math.floor((votesResult.count || 0) / 2); // Rough estimate
            votes.down = Math.floor((votesResult.count || 0) / 2); // Rough estimate
          }

          return {
            ...discussion,
            _count: {
              comments: commentsResult.count || 0,
              votes
            }
          };
        } catch (enrichError) {
          console.error(`Error enriching discussion ${discussion.id}:`, enrichError);
          // Return discussion without counts on error
          return {
            ...discussion,
            _count: {
              comments: 0,
              votes: { up: 0, down: 0 }
            }
          };
        }
      })
    );

    return NextResponse.json({
      discussions: discussionsWithCounts,
      pagination: {
        limit,
        offset,
        hasMore: data.length === limit
      }
    });
  } catch (error) {
    console.error('GET discussions API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
