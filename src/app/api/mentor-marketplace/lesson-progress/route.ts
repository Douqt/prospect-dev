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

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch lesson progress for the course
    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching lesson progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lesson progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: progress || []
    });

  } catch (error) {
    console.error('Error in lesson progress API:', error);
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
    const { lessonId, courseId, isCompleted } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json(
        { error: 'Lesson ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is enrolled in the course
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'completed')
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if progress record already exists
    const { data: existingProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .single();

    let progressResult;
    if (existingProgress) {
      // Update existing progress
      const updateData: any = {
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      };

      if (isCompleted && !existingProgress.completed_at) {
        updateData.completed_at = new Date().toISOString();
      } else if (!isCompleted) {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('lesson_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating lesson progress:', error);
        return NextResponse.json(
          { error: 'Failed to update lesson progress' },
          { status: 500 }
        );
      }
      progressResult = data;
    } else {
      // Insert new progress record
      const insertData: any = {
        student_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        is_completed: isCompleted
      };

      if (isCompleted) {
        insertData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('lesson_progress')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating lesson progress:', error);
        return NextResponse.json(
          { error: 'Failed to save lesson progress' },
          { status: 500 }
        );
      }
      progressResult = data;
    }

    // Update course progress percentage
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('is_completed', true);

    if (allLessons && completedLessons) {
      const progressPercentage = Math.round((completedLessons.length / allLessons.length) * 100);

      await supabase
        .from('purchases')
        .update({ progress_percentage: progressPercentage })
        .eq('student_id', user.id)
        .eq('course_id', courseId);
    }

    return NextResponse.json({
      success: true,
      message: 'Lesson progress saved successfully',
      progress: progressResult
    });

  } catch (error) {
    console.error('Error in lesson progress API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
