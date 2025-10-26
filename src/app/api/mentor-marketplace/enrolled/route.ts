import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get enrolled courses with course details
    const { data: enrolledCourses, error } = await supabase
      .from('purchases')
      .select(`
        *,
        courses!inner(
          id,
          title,
          description,
          price,
          currency,
          category,
          level,
          mentor_id,
          thumbnail_url,
          trailer_video_id,
          is_published,
          total_lessons,
          total_duration_minutes,
          average_rating,
          total_enrollments,
          tags,
          created_at,
          updated_at,
          profiles!mentor_id(
            id,
            email,
            username,
            display_name,
            avatar_url,
            role
          )
        )
      `)
      .eq('student_id', user.id)
      .eq('status', 'completed')
      .eq('courses.is_published', true);

    if (error) {
      console.error('Error fetching enrolled courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch enrolled courses' },
        { status: 500 }
      );
    }

    // Transform the data to match our Course interface
    const transformedCourses = (enrolledCourses || []).map((enrollment: any) => ({
      id: enrollment.courses.id,
      title: enrollment.courses.title,
      description: enrollment.courses.description,
      price: enrollment.courses.price,
      currency: enrollment.courses.currency,
      category: enrollment.courses.category,
      level: enrollment.courses.level,
      mentor_id: enrollment.courses.mentor_id,
      mentor: enrollment.courses.profiles,
      thumbnail_url: enrollment.courses.thumbnail_url,
      trailer_video_id: enrollment.courses.trailer_video_id,
      is_published: enrollment.courses.is_published,
      total_lessons: enrollment.courses.total_lessons || 0,
      total_duration_minutes: enrollment.courses.total_duration_minutes || 0,
      average_rating: enrollment.courses.average_rating || 0,
      total_enrollments: enrollment.courses.total_enrollments || 0,
      tags: enrollment.courses.tags || [],
      created_at: enrollment.courses.created_at,
      updated_at: enrollment.courses.updated_at,
      enrolled_at: enrollment.enrolled_at,
      progress_percentage: enrollment.progress_percentage,
    }));

    return NextResponse.json({
      data: transformedCourses,
      count: transformedCourses.length,
    });

  } catch (error) {
    console.error('Error in enrolled courses API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
