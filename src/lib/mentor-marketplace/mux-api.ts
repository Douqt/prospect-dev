/**
 * Mux API integration for video upload and management
 * Mux provides superior video infrastructure compared to Vimeo
 */

interface MuxAsset {
  id: string;
  status: string;
  playback_ids?: Array<{
    id: string;
    policy: string;
  }>;
  tracks?: Array<{
    id: string;
    type: string;
    duration: number;
  }>;
  created_at: string;
  duration?: number;
}

interface MuxUpload {
  id: string;
  asset_id: string;
  status: string;
  error?: {
    type: string;
    messages: string[];
  };
}

/**
 * Resolve the actual Asset ID from either an Upload ID or Asset ID
 */
async function resolveAssetId(id: string): Promise<{
  success: boolean;
  assetId?: string;
  error?: string;
}> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return { success: false, error: 'Mux API credentials not configured' };
    }

    // First, try to treat it as an Asset ID
    let response = await fetch(`https://api.mux.com/video/v1/assets/${id}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    if (response.ok) {
      // It's a valid Asset ID
      return { success: true, assetId: id };
    }

    // If 404 or 400, try as Upload ID
    if (response.status === 404 || response.status === 400) {
      response = await fetch(`https://api.mux.com/video/v1/uploads/${id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
        }
      });

      if (response.ok) {
        const uploadData = await response.json();
        const assetId = uploadData.data?.asset_id;
        if (assetId) {
          return { success: true, assetId };
        } else {
          return { success: false, error: 'Upload found but no asset_id available' };
        }
      }
    }

    return { success: false, error: 'Unable to resolve asset ID' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Upload video directly to Mux
 */
export async function uploadVideoToMux(
  fileBuffer: Buffer,
  fileName: string,
  mentorId: string
): Promise<{ success: boolean; assetId?: string; playbackId?: string; error?: string }> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      console.error('Mux credentials not configured:', { hasTokenId: !!MUX_TOKEN_ID, hasTokenSecret: !!MUX_TOKEN_SECRET });
      return {
        success: false,
        error: 'Mux API credentials not configured. Please check MUX_TOKEN_ID and MUX_TOKEN_SECRET in environment variables.'
      };
    }

    // Validate credential format
    if (MUX_TOKEN_ID.length < 10 || MUX_TOKEN_SECRET.length < 10) {
      console.error('Mux credentials appear to be invalid format');
      return {
        success: false,
        error: 'Mux API credentials appear to be invalid. Please check your Mux Token ID and Secret.'
      };
    }

    // Create a direct upload URL with longer timeout settings
    const createResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policy: ['public'],
          video_quality: 'basic',
          max_resolution_tier: '1080p' // Limit resolution for faster processing
        },
        cors_origin: '*'
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('Mux create upload error:', errorData);
      return {
        success: false,
        error: 'Failed to create upload URL'
      };
    }

    const uploadData = await createResponse.json();
    console.log('Mux upload creation response:', JSON.stringify(uploadData, null, 2));

    // Validate that we got an asset ID from Mux
    // Note: Mux returns the asset ID in the 'id' field, not 'asset_id'
    if (!uploadData.data?.id) {
      console.error('No id in Mux upload response:', uploadData);
      return {
        success: false,
        error: 'Failed to create video asset - no asset ID returned'
      };
    }

    // In Mux, the upload creation returns an upload ID, but we need the actual asset ID
    // The asset is created asynchronously, so we might need to wait a moment
    console.log('Upload created with ID:', uploadData.data.id);

    // For large files, use a simpler approach - just try once with extended timeout
    // Mux handles resumable uploads automatically
    console.log(`Uploading file: ${fileName} (${Math.round(fileBuffer.length / 1024 / 1024)}MB)`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for large files

      const uploadResponse = await fetch(uploadData.data.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(fileBuffer),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Mux upload error:', uploadResponse.status, uploadResponse.statusText, errorText);
        return {
          success: false,
          error: `Failed to upload video file: ${uploadResponse.status} ${uploadResponse.statusText}`
        };
      }

      console.log('File uploaded successfully to Mux');

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: `Failed to upload video: ${error instanceof Error ? error.message : 'Network error'}`
      };
    }

    // In Mux, the upload creation returns an upload ID, not an asset ID
    // We need to wait for the asset to be created and get the actual asset ID
    const uploadId = uploadData.data.id;
    console.log('Upload ID:', uploadId);

    // Wait for Mux to process the upload and create the asset
    console.log('Waiting for asset creation...');

    // Poll for the asset status until it's ready or we timeout
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    let assetId: string | null = null;
    let playbackId: string | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Checking asset status, attempt ${attempts}/${maxAttempts}`);

      try {
        // Check if the upload has created an asset
        const uploadResponse = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
          }
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          const uploadAssetId = uploadData.data?.asset_id;

          if (uploadAssetId) {
            console.log('Found asset ID from upload:', uploadAssetId);
            assetId = uploadAssetId;

            // Now get the asset details to get the playback ID
            const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${uploadAssetId}`, {
              headers: {
                'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
              }
            });

            if (assetResponse.ok) {
              const assetData = await assetResponse.json();
              playbackId = assetData.data.playback_ids?.[0]?.id;
              console.log('Found playback ID:', playbackId);

              // Check if the asset is ready
              if (assetData.data.status === 'ready') {
                console.log('Asset is ready!');
                return {
                  success: true,
                  assetId,
                  playbackId
                };
              } else if (assetData.data.status === 'errored') {
                console.error('Asset processing failed');
                return {
                  success: false,
                  error: 'Video processing failed'
                };
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error checking asset status (attempt ${attempts}):`, error);
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // If we get here, we couldn't get the asset ID within the timeout
    console.error('Failed to get asset ID within timeout period');
    return {
      success: false,
      error: 'Video upload timeout - asset not ready within 60 seconds'
    };

  } catch (error) {
    console.error('Error uploading video to Mux:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get video details from Mux
 */
export async function getMuxVideoDetails(assetId: string): Promise<{
  success: boolean;
  asset?: MuxAsset;
  error?: string;
}> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return {
        success: false,
        error: 'Mux API credentials not configured'
      };
    }

    // Resolve the actual asset ID
    const resolveResult = await resolveAssetId(assetId);
    if (!resolveResult.success || !resolveResult.assetId) {
      return {
        success: false,
        error: resolveResult.error || 'Failed to resolve asset ID'
      };
    }

    const actualAssetId = resolveResult.assetId;

    const response = await fetch(`https://api.mux.com/video/v1/assets/${actualAssetId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to get video details'
      };
    }

    const data = await response.json();

    return {
      success: true,
      asset: data.data
    };

  } catch (error) {
    console.error('Error getting Mux video details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get video duration from Mux
 */
export async function getMuxVideoDuration(assetId: string): Promise<{
  success: boolean;
  duration?: number;
  error?: string;
}> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return {
        success: false,
        error: 'Mux API credentials not configured'
      };
    }

    // Resolve the actual asset ID
    const resolveResult = await resolveAssetId(assetId);
    if (!resolveResult.success || !resolveResult.assetId) {
      return {
        success: false,
        error: resolveResult.error || 'Failed to resolve asset ID'
      };
    }

    const actualAssetId = resolveResult.assetId;

    const response = await fetch(`https://api.mux.com/video/v1/assets/${actualAssetId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to get video duration'
      };
    }

    const data = await response.json();

    if (!data.data || !data.data.duration) {
      return {
        success: false,
        error: 'Video duration not available'
      };
    }

    return {
      success: true,
      duration: data.data.duration
    };

  } catch (error) {
    console.error('Error getting Mux video duration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Delete video from Mux
 */
export async function deleteMuxVideo(assetId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return {
        success: false,
        error: 'Mux API credentials not configured'
      };
    }

    // Resolve the actual asset ID
    const resolveResult = await resolveAssetId(assetId);
    if (!resolveResult.success || !resolveResult.assetId) {
      return {
        success: false,
        error: resolveResult.error || 'Failed to resolve asset ID'
      };
    }

    const actualAssetId = resolveResult.assetId;

    const response = await fetch(`https://api.mux.com/video/v1/assets/${actualAssetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to delete video'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error deleting Mux video:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get Mux playback URL
 */
export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get Mux thumbnail URL
 */
export function getMuxThumbnailUrl(assetId: string, playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg`;
}

/**
 * Validate Mux API connection
 */
export async function validateMuxConnection(): Promise<boolean> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return false;
    }

    const response = await fetch('https://api.mux.com/video/v1/assets', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating Mux connection:', error);
    return false;
  }
}

/**
 * Get video analytics from Mux
 */
export async function getMuxVideoAnalytics(assetId: string): Promise<{
  success: boolean;
  analytics?: any;
  error?: string;
}> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return {
        success: false,
        error: 'Mux API credentials not configured'
      };
    }

    // Resolve the actual asset ID
    const resolveResult = await resolveAssetId(assetId);
    if (!resolveResult.success || !resolveResult.assetId) {
      return {
        success: false,
        error: resolveResult.error || 'Failed to resolve asset ID'
      };
    }

    const actualAssetId = resolveResult.assetId;

    const response = await fetch(`https://api.mux.com/video/v1/assets/${actualAssetId}/metrics`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to get video analytics'
      };
    }

    const data = await response.json();

    return {
      success: true,
      analytics: data.data
    };

  } catch (error) {
    console.error('Error getting Mux video analytics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check video processing status from Mux
 * Mux videos go through states: preparing -> ready (or errored)
 */
export async function getMuxVideoStatus(assetId: string): Promise<{
  success: boolean;
  status?: 'preparing' | 'ready' | 'errored';
  playbackId?: string;
  assetId?: string;
  error?: string;
}> {
  try {
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

    console.log('Environment check:', {
      hasTokenId: !!MUX_TOKEN_ID,
      hasTokenSecret: !!MUX_TOKEN_SECRET,
      tokenIdLength: MUX_TOKEN_ID?.length,
      tokenSecretLength: MUX_TOKEN_SECRET?.length
    });

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      console.error('Mux credentials not configured');
      return {
        success: false,
        error: 'Mux API credentials not configured'
      };
    }

    if (!assetId) {
      console.error('No assetId provided to getMuxVideoStatus');
      return {
        success: false,
        error: 'Asset ID is required'
      };
    }

    console.log(`Checking Mux status for asset: ${assetId}`);

    // Resolve the actual asset ID
    const resolveResult = await resolveAssetId(assetId);
    if (!resolveResult.success || !resolveResult.assetId) {
      return {
        success: false,
        error: resolveResult.error || 'Failed to resolve asset ID'
      };
    }

    const actualAssetId = resolveResult.assetId;

    // Now fetch the asset details using the resolved ID
    const response = await fetch(`https://api.mux.com/video/v1/assets/${actualAssetId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mux Assets API error (${response.status}):`, errorText);
      return {
        success: false,
        error: `Failed to get video status: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    console.log('Mux asset data:', JSON.stringify(data, null, 2));

    if (!data.data) {
      console.error('No data in Mux response:', data);
      return {
        success: false,
        error: 'Invalid response from Mux API'
      };
    }

    const asset = data.data;

    // Map Mux status to our status
    let status: 'preparing' | 'ready' | 'errored' = 'preparing';

    if (asset.status === 'ready') {
      status = 'ready';
    } else if (asset.status === 'errored') {
      status = 'errored';
    } else {
      status = 'preparing';
    }

    // Get playback ID if available
    const playbackId = asset.playback_ids?.[0]?.id;

    console.log(`Asset status: ${asset.status}, mapped to: ${status}, playbackId: ${playbackId}`);

    return {
      success: true,
      status,
      playbackId,
      assetId: actualAssetId
    };

  } catch (error) {
    console.error('Error getting Mux video status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Poll video status until it's ready or errored
 * Returns a promise that resolves when processing is complete
 */
export async function waitForVideoProcessing(
  assetId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{
  success: boolean;
  status?: 'ready' | 'errored';
  playbackId?: string;
  error?: string;
}> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Checking video status, attempt ${attempt}/${maxAttempts} for asset ${assetId}`);

    const result = await getMuxVideoStatus(assetId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to check video status'
      };
    }

    if (result.status === 'ready') {
      return {
        success: true,
        status: 'ready',
        playbackId: result.playbackId
      };
    }

    if (result.status === 'errored') {
      return {
        success: false,
        status: 'errored',
        error: 'Video processing failed'
      };
    }

    // If not ready and not errored, wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // Max attempts reached, video is still processing
  return {
    success: false,
    error: `Video processing timeout after ${maxAttempts} attempts (${Math.round(maxAttempts * intervalMs / 1000)} seconds)`
  };
}
