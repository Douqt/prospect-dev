import Vimeo from 'vimeo';

// Vimeo API configuration
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
const VIMEO_CLIENT_ID = process.env.VIMEO_CLIENT_ID;
const VIMEO_CLIENT_SECRET = process.env.VIMEO_CLIENT_SECRET;

// Initialize Vimeo client
const vimeoClient = new Vimeo.Vimeo(
  VIMEO_CLIENT_ID,
  VIMEO_CLIENT_SECRET,
  VIMEO_ACCESS_TOKEN
);

// Maximum videos per mentor (50 as per requirements)
const MAX_VIDEOS_PER_MENTOR = 50;

/**
 * Upload video to Vimeo
 */
export async function uploadVideoToVimeo(
  filePath: string,
  fileName: string,
  mentorId: string
): Promise<{ success: boolean; videoId?: string; error?: any }> {
  try {
    // Check if mentor has reached video limit
    const videoCount = await getMentorVideoCount(mentorId);
    if (videoCount >= MAX_VIDEOS_PER_MENTOR) {
      return {
        success: false,
        error: `Maximum video limit (${MAX_VIDEOS_PER_MENTOR}) reached for this mentor`,
      };
    }

    return new Promise((resolve) => {
      vimeoClient.upload(
        filePath,
        {
          name: fileName,
          description: `Uploaded by mentor ${mentorId}`,
          privacy: {
            view: 'disable', // Private until lesson is published
          },
        },
        (uri: string) => {
          // Extract video ID from URI
          const videoId = uri.split('/').pop();
          resolve({ success: true, videoId });
        },
        (bytesUploaded: number, bytesTotal: number) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          console.log(`${percentage}% uploaded`);
        },
        (error: any) => {
          console.error('Vimeo upload error:', error);
          resolve({ success: false, error });
        }
      );
    });
  } catch (error) {
    console.error('Error uploading video to Vimeo:', error);
    return { success: false, error };
  }
}

/**
 * Get mentor's video count
 */
export async function getMentorVideoCount(mentorId: string): Promise<number> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: '/me/videos',
          query: {
            per_page: 100,
            fields: 'uri,name,created_time', // Use field filtering for efficiency
          },
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error getting video count:', error);
            resolve(0);
          } else {
            resolve(body.data?.length || 0);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting mentor video count:', error);
    return 0;
  }
}

/**
 * Get video details by ID
 */
export async function getVideoDetails(videoId: string): Promise<{
  success: boolean;
  video?: any;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: `/videos/${videoId}`,
          query: {
            fields: 'uri,name,duration,embed,thumbnail,status,created_time', // Field filtering
          },
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error getting video details:', error);
            resolve({ success: false, error });
          } else {
            resolve({ success: true, video: body });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting video details:', error);
    return { success: false, error };
  }
}

/**
 * Update video privacy settings
 */
export async function updateVideoPrivacy(
  videoId: string,
  isPublic: boolean
): Promise<{ success: boolean; error?: any }> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'PATCH',
          path: `/videos/${videoId}`,
          body: {
            privacy: {
              view: isPublic ? 'anybody' : 'disable',
            },
          },
        },
        (error: any) => {
          if (error) {
            console.error('Error updating video privacy:', error);
            resolve({ success: false, error });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error updating video privacy:', error);
    return { success: false, error };
  }
}

/**
 * Delete video from Vimeo
 */
export async function deleteVideoFromVimeo(videoId: string): Promise<{
  success: boolean;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'DELETE',
          path: `/videos/${videoId}`,
        },
        (error: any) => {
          if (error) {
            console.error('Error deleting video:', error);
            resolve({ success: false, error });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error deleting video from Vimeo:', error);
    return { success: false, error };
  }
}

/**
 * Get embed code for video
 */
export async function getVideoEmbedCode(videoId: string): Promise<{
  success: boolean;
  embedCode?: string;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: `/videos/${videoId}`,
          query: {
            fields: 'embed',
          },
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error getting embed code:', error);
            resolve({ success: false, error });
          } else {
            resolve({
              success: true,
              embedCode: body.embed?.html,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting video embed code:', error);
    return { success: false, error };
  }
}

/**
 * Generate thumbnail URL for video
 */
export function getVideoThumbnailUrl(videoId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeMap = {
    small: '320x180',
    medium: '640x360',
    large: '1280x720',
  };

  return `https://vumbnail.com/${videoId}_${sizeMap[size]}.jpg`;
}

/**
 * Check video upload status
 */
export async function checkVideoStatus(videoId: string): Promise<{
  success: boolean;
  status?: string;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: `/videos/${videoId}`,
          query: {
            fields: 'status',
          },
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error checking video status:', error);
            resolve({ success: false, error });
          } else {
            resolve({
              success: true,
              status: body.status,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error checking video status:', error);
    return { success: false, error };
  }
}

/**
 * Batch upload multiple videos
 */
export async function batchUploadVideos(
  files: Array<{ path: string; name: string }>,
  mentorId: string
): Promise<{
  success: boolean;
  results: Array<{ fileName: string; videoId?: string; error?: any }>;
  error?: any;
}> {
  try {
    const results = [];

    for (const file of files) {
      const result = await uploadVideoToVimeo(file.path, file.name, mentorId);
      results.push({
        fileName: file.name,
        videoId: result.videoId,
        error: result.error,
      });

      // Stop if mentor reaches video limit
      if (!result.success && result.error?.includes('Maximum video limit')) {
        break;
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error in batch upload:', error);
    return { success: false, results: [], error };
  }
}

/**
 * Get mentor's videos with pagination
 */
export async function getMentorVideos(
  mentorId: string,
  page: number = 1,
  perPage: number = 20
): Promise<{
  success: boolean;
  videos?: any[];
  total?: number;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: '/me/videos',
          query: {
            page: page,
            per_page: perPage,
            fields: 'uri,name,duration,thumbnail,status,created_time', // Field filtering for efficiency
          },
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error getting mentor videos:', error);
            resolve({ success: false, error });
          } else {
            resolve({
              success: true,
              videos: body.data,
              total: body.total,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting mentor videos:', error);
    return { success: false, error };
  }
}

/**
 * Search videos by name
 */
export async function searchMentorVideos(
  mentorId: string,
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<{
  success: boolean;
  videos?: any[];
  total?: number;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: '/me/videos',
          query: {
            page: page,
            per_page: perPage,
            query: query,
            fields: 'uri,name,duration,thumbnail,status,created_time',
          },
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error searching videos:', error);
            resolve({ success: false, error });
          } else {
            resolve({
              success: true,
              videos: body.data,
              total: body.total,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error searching mentor videos:', error);
    return { success: false, error };
  }
}

/**
 * Validate Vimeo API connection
 */
export async function validateVimeoConnection(): Promise<boolean> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: '/me',
          query: {
            fields: 'uri,name',
          },
        },
        (error: any) => {
          if (error) {
            console.error('Vimeo API connection error:', error);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error validating Vimeo connection:', error);
    return false;
  }
}

/**
 * Get video analytics (views, plays, etc.)
 */
export async function getVideoAnalytics(videoId: string): Promise<{
  success: boolean;
  analytics?: any;
  error?: any;
}> {
  try {
    return new Promise((resolve) => {
      vimeoClient.request(
        {
          method: 'GET',
          path: `/videos/${videoId}/stats`,
        },
        (error: any, body: any) => {
          if (error) {
            console.error('Error getting video analytics:', error);
            resolve({ success: false, error });
          } else {
            resolve({
              success: true,
              analytics: body,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error getting video analytics:', error);
    return { success: false, error };
  }
}
