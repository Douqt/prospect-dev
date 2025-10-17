import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { addIndexedFilter } from '@/lib/pagination'

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()

    // Verify authenticated user (security-critical)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Only allow users to access their own profile data
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get user profile data with indexed filter
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, dark_mode, last_login');

    profileQuery = addIndexedFilter(profileQuery, 'profiles', { user_id: userId });

    const { data: profile, error } = await profileQuery.single()

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
