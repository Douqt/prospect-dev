import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and owns the course
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('mentor_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (course.mentor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view lessons for this course' },
        { status: 401 }
      );
    }

    // Get lessons for the course
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: lessons || [],
    });

  } catch (error) {
    console.error('Error in lessons API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { course_id, title, description, video_id, duration_minutes, is_preview, order_index } = body;

    if (!course_id || !title || !video_id || !duration_minutes) {
      return NextResponse.json(
        { error: 'Course ID, title, video ID, and duration are required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and owns the course
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('mentor_id')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (course.mentor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to add lessons to this course' },
        { status: 401 }
      );
    }

    // Create the lesson
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({
        course_id,
        title,
        description,
        video_id,
        duration_minutes,
        is_preview: is_preview || false,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      return NextResponse.json(
        { error: 'Failed to create lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: lesson,
      message: 'Lesson created successfully',
    });

  } catch (error) {
    console.error('Error in create lesson API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
