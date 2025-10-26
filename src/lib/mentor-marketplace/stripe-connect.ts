import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Platform fee percentage (20%)
const PLATFORM_FEE_PERCENTAGE = 0.20;

/**
 * Create a Stripe Connect account for a mentor
 */
export async function createStripeConnectAccount(mentorId: string, email: string) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        mentor_id: mentorId,
      },
    });

    return { success: true, accountId: account.id };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return { success: false, error: error };
  }
}

/**
 * Generate account onboarding link for mentor
 */
export async function createAccountOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error('Error creating account onboarding link:', error);
    return { success: false, error: error };
  }
}

/**
 * Get account status
 */
export async function getAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      success: true,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      },
    };
  } catch (error) {
    console.error('Error getting account status:', error);
    return { success: false, error: error };
  }
}

/**
 * Create payment intent for course purchase
 */
export async function createPaymentIntent(
  amount: number,
  currency: string,
  courseId: string,
  studentId: string,
  mentorAccountId: string
) {
  try {
    // Calculate application fee (platform commission)
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_PERCENTAGE);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: mentorAccountId,
      },
      metadata: {
        course_id: courseId,
        student_id: studentId,
        mentor_account_id: mentorAccountId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return { success: false, error: error };
  }
}

/**
 * Confirm payment and create transfer
 */
export async function confirmPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Payment succeeded, now create the transfer for the mentor's share
      const transfer = await stripe.transfers.create({
        amount: paymentIntent.transfer_data?.amount || 0,
        currency: paymentIntent.currency,
        destination: paymentIntent.transfer_data?.destination as string,
      });

      return {
        success: true,
        transferId: transfer.id,
        transferAmount: transfer.amount,
      };
    }

    return { success: false, error: 'Payment not succeeded' };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return { success: false, error: error };
  }
}

/**
 * Create payout to mentor's bank account
 */
export async function createPayout(accountId: string, amount: number, currency: string = 'usd') {
  try {
    const payout = await stripe.payouts.create(
      {
        amount: amount,
        currency: currency,
      },
      {
        stripeAccount: accountId,
      }
    );

    return { success: true, payoutId: payout.id };
  } catch (error) {
    console.error('Error creating payout:', error);
    return { success: false, error: error };
  }
}

/**
 * Get mentor's balance
 */
export async function getMentorBalance(accountId: string) {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    return {
      success: true,
      available: balance.available,
      pending: balance.pending,
    };
  } catch (error) {
    console.error('Error getting mentor balance:', error);
    return { success: false, error: error };
  }
}

/**
 * Webhook handler for Stripe events
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Handle successful payment
        console.log('Payment succeeded:', paymentIntent.id);

        // Update purchase status in database
        // This would typically call a database update function

        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        console.log('Transfer created:', transfer.id);
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout completed:', payout.id);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling webhook:', error);
    return { success: false, error: error };
  }
}

/**
 * Calculate platform fees and mentor payouts
 */
export function calculateCommission(amount: number) {
  const platformFee = amount * PLATFORM_FEE_PERCENTAGE;
  const mentorPayout = amount - platformFee;

  return {
    platformFee: Math.round(platformFee),
    mentorPayout: Math.round(mentorPayout),
    totalAmount: amount,
  };
}

/**
 * Format amount for Stripe (convert to cents)
 */
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Format amount from Stripe (convert from cents)
 */
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}
