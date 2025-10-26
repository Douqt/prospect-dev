import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteMuxVideo } from '@/lib/mentor-marketplace/mux-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Get the course with mentor information
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        mentor:profiles!courses_mentor_id_fkey(*)
      `)
      .eq('id', courseId)
      .eq('is_published', true)
      .single();

    if (error || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: course,
    });

  } catch (error) {
    console.error('Error in get course API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: courseId } = await params;
    const body = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the course to verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('mentor_id')
      .eq('id', courseId)
      .single();

    if (fetchError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Verify the user is the course mentor
    if (course.mentor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this course' },
        { status: 401 }
      );
    }

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update(body)
      .eq('id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating course:', updateError);
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updatedCourse,
      message: 'Course updated successfully',
    });

  } catch (error) {
    console.error('Error in update course API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the course to verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('mentor_id')
      .eq('id', courseId)
      .single();

    if (fetchError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Verify the user is the course mentor
    if (course.mentor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this course' },
        { status: 401 }
      );
    }

    // Get all lessons for the course to delete their videos from Mux
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('video_id')
      .eq('course_id', courseId);

    if (lessonsError) {
      console.error('Error fetching lessons for course:', lessonsError);
      return NextResponse.json(
        { error: 'Failed to fetch lessons for course' },
        { status: 500 }
      );
    }

    // Delete all lesson videos from Mux
    if (lessons && lessons.length > 0) {
      for (const lesson of lessons) {
        try {
          const deleteResult = await deleteMuxVideo(lesson.video_id);
          if (!deleteResult.success) {
            console.error(`Failed to delete video ${lesson.video_id} from Mux:`, deleteResult.error);
            // Continue with other deletions even if one fails
          }
        } catch (error) {
          console.error(`Error deleting video ${lesson.video_id} from Mux:`, error);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Delete the course (this will cascade to lessons, purchases, and commissions)
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Course deleted successfully',
    });

  } catch (error) {
    console.error('Error in delete course API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
