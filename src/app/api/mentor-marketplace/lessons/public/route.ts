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

    // Get preview lessons for the course (publicly accessible)
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_preview', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching preview lessons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preview lessons' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: lessons || [],
    });

  } catch (error) {
    console.error('Error in public lessons API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
