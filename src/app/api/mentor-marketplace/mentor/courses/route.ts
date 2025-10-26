import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { Course } from '@/types/mentor-marketplace';

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

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        lessons(count),
        purchases(count),
        profiles!mentor_id(
          id,
          email,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mentor courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Transform the data to match our Course interface
    const transformedCourses: Course[] = (courses || []).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      currency: course.currency,
      category: course.category,
      level: course.level,
      mentor_id: course.mentor_id,
      mentor: course.profiles,
      thumbnail_url: course.thumbnail_url,
      trailer_video_id: course.trailer_video_id,
      is_published: course.is_published,
      total_lessons: course.lessons?.[0]?.count || 0,
      total_duration_minutes: course.total_duration_minutes || 0,
      average_rating: course.average_rating || 0,
      total_enrollments: course.purchases?.[0]?.count || 0,
      tags: course.tags || [],
      created_at: course.created_at,
      updated_at: course.updated_at,
    }));

    return NextResponse.json({
      data: transformedCourses,
    });

  } catch (error) {
    console.error('Error in mentor courses API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
