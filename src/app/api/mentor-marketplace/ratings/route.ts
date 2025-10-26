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

    // Fetch user's rating for the course
    const { data: rating, error } = await supabase
      .from('course_ratings')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching rating:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rating: rating || null
    });

  } catch (error) {
    console.error('Error in ratings API:', error);
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
    const { courseId, rating, review } = body;

    if (!courseId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Course ID and valid rating (1-5) are required' },
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
        { error: 'You must be enrolled in this course to rate it' },
        { status: 403 }
      );
    }

    // Check if user has already rated this course
    const { data: existingRating } = await supabase
      .from('course_ratings')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    let ratingResult;
    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from('course_ratings')
        .update({
          rating,
          review,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rating:', error);
        return NextResponse.json(
          { error: 'Failed to update rating' },
          { status: 500 }
        );
      }
      ratingResult = data;
    } else {
      // Insert new rating
      const { data, error } = await supabase
        .from('course_ratings')
        .insert({
          student_id: user.id,
          course_id: courseId,
          rating,
          review
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating rating:', error);
        return NextResponse.json(
          { error: 'Failed to submit rating' },
          { status: 500 }
        );
      }
      ratingResult = data;
    }

    // Update course average rating
    const { data: ratings, error: ratingsError } = await supabase
      .from('course_ratings')
      .select('rating')
      .eq('course_id', courseId);

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return NextResponse.json(
        { error: 'Failed to fetch ratings for average calculation' },
        { status: 500 }
      );
    }

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0.0;

    console.log(`Updating course ${courseId} average rating to ${averageRating} based on ${totalRatings} ratings`);

    const { data: updateData, error: updateError } = await supabase
      .from('courses')
      .update({
        average_rating: averageRating,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select();

    if (updateError) {
      console.error('Error updating average rating:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json(
        { error: 'Failed to update course average rating' },
        { status: 500 }
      );
    }

    console.log('Successfully updated average rating:', updateData);

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: ratingResult
    });

  } catch (error) {
    console.error('Error in ratings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
