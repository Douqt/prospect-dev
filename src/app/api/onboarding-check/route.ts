import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Safely parse URL with error handling
    let searchParams;
    try {
      const url = new URL(request.url)
      searchParams = url.searchParams
    } catch (urlError) {
      console.error('Failed to parse request URL:', urlError)
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 })
    }
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if user exists and is onboarded
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, onboarded, username')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Onboarding check error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      exists: !!profile,
      onboarded: profile?.onboarded || false,
      username: profile?.username || null
    })
  } catch (error) {
    console.error('Onboarding check API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
