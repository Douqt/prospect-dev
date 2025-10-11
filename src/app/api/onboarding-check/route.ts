import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()

    const { searchParams } = new URL(request.url)
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
