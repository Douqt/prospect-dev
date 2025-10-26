import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { MentorAnalytics } from '@/types/mentor-marketplace';

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

    // Get basic stats
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, created_at')
      .eq('mentor_id', mentorId);

    if (coursesError) {
      console.error('Error fetching courses for analytics:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    const totalCourses = courses?.length || 0;

    // Get total students (unique students who purchased courses)
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('student_id, course_id, amount_paid, enrolled_at')
      .eq('status', 'completed')
      .in('course_id', courses?.map(c => c.id) || []);

    if (purchasesError) {
      console.error('Error fetching purchases for analytics:', purchasesError);
    }

    const uniqueStudents = new Set(purchases?.map(p => p.student_id) || []);
    const totalStudents = uniqueStudents.size;

    // Calculate total revenue and commissions
    const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
    const platformFee = totalRevenue * 0.20; // 20% platform commission
    const totalCommissionsEarned = totalRevenue - platformFee;

    // Get monthly revenue data (last 12 months)
    const monthlyRevenue = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const monthPurchases = purchases?.filter(p => {
        const purchaseDate = new Date(p.enrolled_at);
        return purchaseDate.getMonth() === date.getMonth() &&
               purchaseDate.getFullYear() === date.getFullYear();
      }) || [];

      const monthRevenue = monthPurchases.reduce((sum, p) => sum + p.amount_paid, 0);
      const monthEnrollments = monthPurchases.length;

      monthlyRevenue.push({
        month: monthName,
        revenue: monthRevenue,
        enrollments: monthEnrollments,
      });
    }

    // Get top performing courses
    const courseStats = courses?.map(course => {
      const coursePurchases = purchases?.filter(p => p.course_id === course.id) || [];
      const courseRevenue = coursePurchases.reduce((sum, p) => sum + p.amount_paid, 0);
      const courseEnrollments = coursePurchases.length;

      return {
        course_id: course.id,
        title: course.title,
        enrollments: courseEnrollments,
        revenue: courseRevenue,
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5) || [];

    const analytics: MentorAnalytics = {
      total_courses: totalCourses,
      total_students: totalStudents,
      total_revenue: totalRevenue,
      total_commissions_earned: totalCommissionsEarned,
      monthly_revenue: monthlyRevenue,
      top_courses: courseStats,
    };

    return NextResponse.json({
      data: analytics,
    });

  } catch (error) {
    console.error('Error in mentor analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
