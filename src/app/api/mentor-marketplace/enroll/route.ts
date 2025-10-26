import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { courseId } = body;

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

    // Check if course exists and get details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user is already enrolled
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check if user is the mentor of this course (prevent self-enrollment)
    if (course.mentor_id === user.id) {
      return NextResponse.json(
        {
          error: 'You cannot enroll in your own course',
          isMentorOfCourse: true
        },
        { status: 400 }
      );
    }

    // For free courses, enroll immediately
    if (course.price === 0) {
      const { error: enrollError } = await supabase
        .from('purchases')
        .insert({
          student_id: user.id,
          course_id: courseId,
          amount_paid: 0,
          currency: course.currency,
          status: 'completed',
          enrolled_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          progress_percentage: 0
        });

      if (enrollError) {
        console.error('Enrollment error:', enrollError);
        return NextResponse.json(
          { error: 'Failed to enroll in course' },
          { status: 500 }
        );
      }

      // Update course enrollment count
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          total_enrollments: course.total_enrollments + 1
        })
        .eq('id', courseId);

      if (updateError) {
        console.error('Error updating enrollment count:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully enrolled in course',
        enrollment: {
          course_id: courseId,
          enrolled_at: new Date().toISOString()
        }
      });
    }

    // For paid courses, create pending purchase and return payment required
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        student_id: user.id,
        course_id: courseId,
        amount_paid: course.price,
        currency: course.currency,
        status: 'pending',
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      return NextResponse.json(
        { error: 'Failed to initiate enrollment' },
        { status: 500 }
      );
    }

    // Update course enrollment count for paid courses as well
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        total_enrollments: course.total_enrollments + 1
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Error updating enrollment count:', updateError);
    }

    return NextResponse.json({
      success: false,
      requiresPayment: true,
      purchase: purchaseData,
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
        currency: course.currency
      }
    });

  } catch (error) {
    console.error('Error in enrollment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
