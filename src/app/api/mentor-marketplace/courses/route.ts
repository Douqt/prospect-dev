import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { CreateCourseForm, Course } from '@/types/mentor-marketplace';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Safely parse URL with error handling
    let searchParams;
    try {
      const url = new URL(request.url)
      searchParams = url.searchParams
    } catch (urlError) {
      console.error('Failed to parse request URL:', urlError)
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 })
    }

    const category = searchParams.get('category') || 'all';
    const level = searchParams.get('level') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Build query
    let query = supabase
      .from('courses')
      .select(`
        *,
        profiles!mentor_id(
          id,
          email,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (level !== 'all') {
      query = query.eq('level', level);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: courses, error, count } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
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
      total_lessons: course.total_lessons || 0,
      total_duration_minutes: course.total_duration_minutes || 0,
      average_rating: course.average_rating || 0,
      total_enrollments: course.total_enrollments || 0,
      tags: course.tags || [],
      created_at: course.created_at,
      updated_at: course.updated_at,
    }));

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    return NextResponse.json({
      data: transformedCourses,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error in courses API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: CreateCourseForm & { mentorId: string } = await request.json();

    const { mentorId, ...courseData } = body;

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

    // Verify the user has mentor role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', mentorId)
      .single();

    if (!userProfile || userProfile.role !== 'mentor') {
      return NextResponse.json(
        { error: 'User must have mentor role' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!courseData.title || !courseData.description || !courseData.category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    // Create the course
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title: courseData.title,
        description: courseData.description,
        price: courseData.price || 0,
        currency: 'USD',
        category: courseData.category,
        level: courseData.level || 'beginner',
        mentor_id: mentorId,
        tags: courseData.tags || [],
        is_published: false, // Courses start as drafts
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: course,
      message: 'Course created successfully',
    });

  } catch (error) {
    console.error('Error in create course API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
