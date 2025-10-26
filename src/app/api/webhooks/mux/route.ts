import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('mux-signature');
    const body = await request.text();

    // Verify webhook signature (implement proper verification)
    // For now, we'll trust the webhook but in production, verify the signature
    if (!signature) {
      console.warn('Missing Mux signature');
    }

    const event = JSON.parse(body);

    console.log('Received Mux webhook:', event.type, event.data);

    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event.data);
        break;
      case 'video.asset.errored':
        await handleAssetErrored(event.data);
        break;
      case 'video.asset.deleted':
        await handleAssetDeleted(event.data);
        break;
      default:
        console.log('Unhandled webhook type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing Mux webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleAssetReady(data: any) {
  try {
    const supabase = await createClient();
    const assetId = data.id;
    const playbackId = data.playback_ids?.[0]?.id;
    const duration = data.duration;

    if (!assetId || !playbackId) {
      console.error('Missing asset ID or playback ID in ready event');
      return;
    }

    // Update video record with processing completion
    const { error } = await supabase
      .from('videos')
      .update({
        duration: Math.round(duration || 0),
        updated_at: new Date().toISOString()
      })
      .eq('mux_asset_id', assetId);

    if (error) {
      console.error('Error updating video after processing:', error);
    } else {
      console.log('Video processing completed:', assetId, playbackId);

      // Invalidate cache for this video
      await invalidateVideoCache(assetId);
    }

  } catch (error) {
    console.error('Error handling asset ready:', error);
  }
}

async function handleAssetErrored(data: any) {
  try {
    const supabase = await createClient();
    const assetId = data.id;

    // Mark video as having an error
    const { error } = await supabase
      .from('videos')
      .update({
        // You might want to add an 'error' field to the videos table
        // For now, we'll just log it
        updated_at: new Date().toISOString()
      })
      .eq('mux_asset_id', assetId);

    if (error) {
      console.error('Error updating video after error:', error);
    } else {
      console.log('Video processing failed:', assetId);
    }

  } catch (error) {
    console.error('Error handling asset error:', error);
  }
}

async function handleAssetDeleted(data: any) {
  try {
    const supabase = await createClient();
    const assetId = data.id;

    // Mark video as deleted or remove it entirely
    const { error } = await supabase
      .from('videos')
      .update({
        is_published: false, // Soft delete
        updated_at: new Date().toISOString()
      })
      .eq('mux_asset_id', assetId);

    if (error) {
      console.error('Error updating video after deletion:', error);
    } else {
      console.log('Video deleted:', assetId);
    }

  } catch (error) {
    console.error('Error handling asset deletion:', error);
  }
}

async function invalidateVideoCache(assetId: string) {
  try {
    // Invalidate any cached data for this video
    // This could involve Redis cache invalidation or other caching strategies
    console.log('Invalidating cache for video:', assetId);

    // Example: If using Redis, you might do:
    // await redis.del(`video:${assetId}`);
    // await redis.del('videos:list:*');

  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}
