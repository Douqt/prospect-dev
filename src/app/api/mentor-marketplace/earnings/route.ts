import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');
    const timeRange = searchParams.get('timeRange') || '30d';

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

    // Get mentor's courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('mentor_id', mentorId);

    if (coursesError) {
      console.error('Error fetching courses for earnings:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch earnings data' },
        { status: 500 }
      );
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({
        data: {
          totalEarned: 0,
          totalCommissions: 0,
          availablePayout: 0,
          pendingPayout: 0,
          monthlyEarnings: [],
          recentTransactions: [],
        },
      });
    }

    const courseIds = courses.map(c => c.id);

    // Get all purchases for mentor's courses
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        *,
        courses!inner(title),
        users!inner(full_name)
      `)
      .eq('status', 'completed')
      .in('course_id', courseIds);

    if (purchasesError) {
      console.error('Error fetching purchases for earnings:', purchasesError);
    }

    // Get all commissions for mentor's courses
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('*')
      .eq('mentor_id', mentorId);

    if (commissionsError) {
      console.error('Error fetching commissions for earnings:', commissionsError);
    }

    // Calculate totals
    const totalEarned = commissions?.reduce((sum, c) => sum + c.mentor_payout, 0) || 0;
    const totalCommissions = commissions?.reduce((sum, c) => sum + c.platform_fee, 0) || 0;

    // Calculate available and pending payouts
    const availablePayout = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.mentor_payout, 0) || 0;
    const pendingPayout = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.mentor_payout, 0) || 0;

    // Generate monthly earnings data
    const monthlyEarnings = [];
    const now = new Date();
    const monthsBack = timeRange === '30d' ? 1 : timeRange === '90d' ? 3 : 12;

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const monthPurchases = purchases?.filter(p => {
        const purchaseDate = new Date(p.created_at);
        return purchaseDate.getMonth() === date.getMonth() &&
               purchaseDate.getFullYear() === date.getFullYear();
      }) || [];

      const monthCommissions = commissions?.filter(c => {
        const commissionDate = new Date(c.created_at);
        return commissionDate.getMonth() === date.getMonth() &&
               commissionDate.getFullYear() === date.getFullYear();
      }) || [];

      const monthEarned = monthCommissions.reduce((sum, c) => sum + c.mentor_payout, 0);
      const monthCommissionsAmount = monthCommissions.reduce((sum, c) => sum + c.platform_fee, 0);
      const coursesSold = monthPurchases.length;

      monthlyEarnings.push({
        month: monthName,
        earned: monthEarned,
        commissions: monthCommissionsAmount,
        coursesSold,
      });
    }

    // Generate recent transactions
    const recentTransactions = purchases?.slice(0, 10).map(purchase => {
      const commission = commissions?.find(c => c.purchase_id === purchase.id);

      return {
        id: purchase.id,
        courseTitle: purchase.courses.title,
        studentName: purchase.users.full_name || 'Anonymous Student',
        amount: purchase.amount_paid,
        commission: commission?.platform_fee || 0,
        earned: commission?.mentor_payout || 0,
        date: purchase.created_at,
        status: purchase.status,
      };
    }) || [];

    const earningsData = {
      totalEarned,
      totalCommissions,
      availablePayout,
      pendingPayout,
      monthlyEarnings,
      recentTransactions,
    };

    return NextResponse.json({
      data: earningsData,
    });

  } catch (error) {
    console.error('Error in earnings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
