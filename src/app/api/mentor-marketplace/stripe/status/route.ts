import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAccountStatus } from '@/lib/mentor-marketplace/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');

    if (!mentorId) {
      return NextResponse.json(
        { error: 'Mentor ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is the mentor
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== mentorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get mentor's Stripe account ID
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', mentorId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (!userProfile.stripe_account_id) {
      return NextResponse.json({
        account: null,
      });
    }

    // Get account status from Stripe
    const statusResult = await getAccountStatus(userProfile.stripe_account_id);

    if (!statusResult.success) {
      console.error('Error getting Stripe account status:', statusResult.error);
      return NextResponse.json(
        { error: 'Failed to get account status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      account: statusResult.account,
    });

  } catch (error) {
    console.error('Error in Stripe status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
