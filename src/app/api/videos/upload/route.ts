import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadVideoToMux } from '@/lib/mentor-marketplace/mux-api';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

async function handler(request: NextRequest) {
  try {
    // Validate Mux configuration
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.error('Mux configuration error: Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET');
      return NextResponse.json(
        { error: 'Mux API is not properly configured. Please configure valid Mux credentials in environment variables.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const formData = await request.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const videoFile = formData.get('video') as File;
    const tags = JSON.parse(formData.get('tags') as string || '[]');

    if (!title || !description || !videoFile) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, video' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
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

    // Convert File to buffer for upload
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Mux and wait for processing to complete
    const uploadResult = await uploadVideoToMux(
      buffer,
      `${title}-${Date.now()}`,
      user.id
    );

    if (!uploadResult.success) {
      console.error('Mux upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload video to Mux' },
        { status: 500 }
      );
    }

    // Validate that we got an asset ID
    if (!uploadResult.assetId || !uploadResult.playbackId) {
      console.error('No asset ID or playback ID returned from Mux upload');
      return NextResponse.json(
        { error: 'Failed to get video ID from upload service' },
        { status: 500 }
      );
    }

    // Get thumbnail URL from Mux
    const thumbnailUrl = `https://image.mux.com/${uploadResult.playbackId}/thumbnail.jpg`;

    // Save video metadata to database
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        title,
        description,
        creator_id: user.id,
        mux_asset_id: uploadResult.assetId,
        mux_playback_id: uploadResult.playbackId,
        thumbnail_url: thumbnailUrl,
        duration: 0, // Will be updated when video processing is complete
        tags: tags || []
      })
      .select()
      .single();

    if (videoError) {
      console.error('Error saving video to database:', videoError);
      return NextResponse.json(
        { error: 'Failed to save video metadata' },
        { status: 500 }
      );
    }

    console.log('Video uploaded successfully:', {
      id: video.id,
      assetId: uploadResult.assetId,
      playbackId: uploadResult.playbackId,
      title,
      fileSize: videoFile.size
    });

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        mux_asset_id: video.mux_asset_id,
        mux_playback_id: video.mux_playback_id,
        thumbnail_url: video.thumbnail_url,
        created_at: video.created_at
      },
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

export const POST = withRateLimit(handler, RATE_LIMITS.UPLOAD);
