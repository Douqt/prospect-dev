import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteMuxVideo } from '@/lib/mentor-marketplace/mux-api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: lessonId } = await params;
    const body = await request.json();

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
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

    // Get the lesson to verify ownership through course
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select(`
        *,
        courses!inner(mentor_id)
      `)
      .eq('id', lessonId)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Verify the user owns the course
    if (lesson.courses.mentor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this lesson' },
        { status: 401 }
      );
    }

    // Update the lesson
    const { data: updatedLesson, error: updateError } = await supabase
      .from('lessons')
      .update(body)
      .eq('id', lessonId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lesson:', updateError);
      return NextResponse.json(
        { error: 'Failed to update lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updatedLesson,
      message: 'Lesson updated successfully',
    });

  } catch (error) {
    console.error('Error in update lesson API:', error);
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
    const { id: lessonId } = await params;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
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

    // Get the lesson to verify ownership through course
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select(`
        *,
        courses!inner(mentor_id)
      `)
      .eq('id', lessonId)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Verify the user owns the course
    if (lesson.courses.mentor_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this lesson' },
        { status: 401 }
      );
    }

    // Delete the lesson
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (deleteError) {
      console.error('Error deleting lesson:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete lesson' },
        { status: 500 }
      );
    }

    // Delete the video from Mux
    try {
      const deleteResult = await deleteMuxVideo(lesson.video_id);
      if (!deleteResult.success) {
        console.error('Failed to delete video from Mux:', deleteResult.error);
        // Don't fail the entire operation if video deletion fails, just log it
      }
    } catch (error) {
      console.error('Error deleting video from Mux:', error);
      // Continue with success response even if video deletion fails
    }

    return NextResponse.json({
      message: 'Lesson deleted successfully',
    });

  } catch (error) {
    console.error('Error in delete lesson API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
