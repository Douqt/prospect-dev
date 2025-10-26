import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { addIndexedFilter } from '@/lib/pagination'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  console.log('Incoming request URL:', request.url)
  try {
    const supabase = await createServerClient()

    // Safely parse URL with error handling
    let searchParams;
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const url = new URL(request.url, base)
      searchParams = url.searchParams
    } catch (urlError) {
      console.error('Failed to parse request URL:', urlError)
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 })
    }

    const userId = searchParams.get('userId')
    const username = searchParams.get('username')

    // Handle getting current user (requires authentication)
    if (userId === 'current') {
      // Verify authenticated user for current user access
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log("Unauthorized user!");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (username) {
      // Allow public access to any user's profile by username
      // (no authentication required for public profile viewing)
    } else if (!userId) {
      console.log("User ID or username required");
      return NextResponse.json({ error: 'User ID or username required' }, { status: 400 })
    } else {
      // Only allow users to access their own profile data (requires authentication)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (userId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get user profile data
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, dark_mode, last_login, role');

    // Query by username or user_id
    if (username) {
      profileQuery = profileQuery.eq('username', username);
    } else {
      // Get user for user_id queries
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // Use the actual user ID for the query
      const actualUserId = userId === 'current' ? user.id : userId;
      profileQuery = addIndexedFilter(profileQuery, 'profiles', { user_id: actualUserId });
    }

    const { data: profile, error } = await profileQuery.single();

    if (error) {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
