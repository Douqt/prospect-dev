import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadVideoToMux } from '@/lib/mentor-marketplace/mux-api';

export async function POST(request: NextRequest) {
  try {
    // Validate Mux configuration
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.error('Mux configuration error: Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET');
      return NextResponse.json(
        { error: 'Mux API is not properly configured. Please configure valid Mux credentials in environment variables.' },
        { status: 500 }
      );
    }

    // Check for placeholder values
    if (process.env.MUX_TOKEN_ID.includes('your_mux') || process.env.MUX_TOKEN_SECRET.includes('your_mux')) {
      console.error('Mux credentials are still using placeholder values');
      return NextResponse.json(
        {
          error: 'Mux API credentials are not configured. Please get your actual Mux Token ID and Secret from your Mux dashboard at https://dashboard.mux.com/ and update your .env.local file.'
        },
        { status: 500 }
      );
    }

    const cookieStore = await import('next/headers').then(m => m.cookies());
    const supabase = await createClient();
    const formData = await request.formData();

    const videoFile = formData.get('video') as File;
    const mentorId = formData.get('mentorId') as string;
    const fileName = formData.get('fileName') as string;

    if (!videoFile || !mentorId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: video, mentorId, fileName' },
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

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mp4', 'video/x-msvideo'];
    console.log('File type:', videoFile.type, 'Size:', videoFile.size);

    if (!allowedTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${videoFile.type}. Only MP4, WebM, and QuickTime videos are allowed.` },
        { status: 400 }
      );
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 500MB' },
        { status: 400 }
      );
    }

    // Check mentor's current video count
    const { data: mentorCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('mentor_id', mentorId);

    if (coursesError) {
      console.error('Error getting mentor courses:', coursesError);
      return NextResponse.json(
        { error: 'Failed to verify mentor courses' },
        { status: 500 }
      );
    }

    if (mentorCourses && mentorCourses.length > 0) {
      const { data: totalVideos, error: videoCountError } = await supabase
        .from('lessons')
        .select('id', { count: 'exact' })
        .in('course_id', mentorCourses.map(c => c.id));

      if (videoCountError) {
        console.error('Error getting video count:', videoCountError);
        return NextResponse.json(
          { error: 'Failed to check video count' },
          { status: 500 }
        );
      }

      if (totalVideos && totalVideos.length >= 50) {
        return NextResponse.json(
          { error: 'Maximum video limit (50) reached for this mentor' },
          { status: 400 }
        );
      }
    }

    // Convert File to buffer for upload
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Mux and wait for processing to complete
    const uploadResult = await uploadVideoToMux(
      buffer,
      fileName,
      mentorId
    );

    if (!uploadResult.success) {
      console.error('Mux upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload video to Mux' },
        { status: 500 }
      );
    }

    // Validate that we got an asset ID
    if (!uploadResult.assetId) {
      console.error('No asset ID returned from Mux upload');
      return NextResponse.json(
        { error: 'Failed to get video ID from upload service' },
        { status: 500 }
      );
    }

    console.log('Video uploaded successfully:', {
      assetId: uploadResult.assetId,
      playbackId: uploadResult.playbackId,
      fileName,
      fileSize: videoFile.size
    });

    return NextResponse.json({
      success: true,
      videoId: uploadResult.assetId,
      playbackId: uploadResult.playbackId,
      message: 'Video uploaded successfully to Mux',
    });

  } catch (error) {
    console.error('Error in video upload API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
