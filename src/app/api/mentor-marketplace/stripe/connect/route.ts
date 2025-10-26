import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createStripeConnectAccount, createAccountOnboardingLink } from '@/lib/mentor-marketplace/stripe-connect';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { mentorId } = await request.json();

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

    // Get user email for Stripe Connect
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', mentorId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if mentor already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', mentorId)
      .single();

    let stripeAccountId = existingAccount?.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!stripeAccountId) {
      const accountResult = await createStripeConnectAccount(mentorId, userProfile.email);

      if (!accountResult.success) {
        return NextResponse.json(
          { error: 'Failed to create Stripe Connect account' },
          { status: 500 }
        );
      }

      stripeAccountId = accountResult.accountId;

      // Save the Stripe account ID to the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', mentorId);

      if (updateError) {
        console.error('Error saving Stripe account ID:', updateError);
      }
    }

    // Create onboarding link
    const refreshUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/mentors/dashboard?stripe_refresh=true`;
    const returnUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/mentors/dashboard?stripe_return=true`;

    const onboardingResult = await createAccountOnboardingLink(
      stripeAccountId,
      refreshUrl,
      returnUrl
    );

    if (!onboardingResult.success) {
      return NextResponse.json(
        { error: 'Failed to create onboarding link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      onboardingUrl: onboardingResult.url,
      accountId: stripeAccountId,
    });

  } catch (error) {
    console.error('Error in Stripe Connect API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
