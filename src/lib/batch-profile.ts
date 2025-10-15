import { supabase } from "./supabaseClient";

interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * Batch fetch profiles for multiple user IDs
 * Optimizes N+1 query problem by fetching all profiles in a single request
 */
export async function fetchBatchProfiles(userIds: string[]): Promise<Record<string, Profile>> {
  if (!userIds.length) return {};

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    if (error) {
      console.error('Error batch fetching profiles:', error);
      return {};
    }

    // Convert array to object keyed by user ID for easy lookup
    const profileMap: Record<string, Profile> = {};
    profiles?.forEach(profile => {
      profileMap[profile.id] = profile;
    });

    return profileMap;
  } catch (error) {
    console.error('Batch profile fetch error:', error);
    return {};
  }
}

/**
 * Enhanced discussion fetcher that includes batch profile loading
 */
export async function fetchDiscussionsWithProfiles(discussionIds?: string[]) {
  // First get discussions
  let query = supabase
    .from('discussions')
    .select('id, title, content, user_id, image_url, category, created_at, upvotes, downvotes, comment_count');

  if (discussionIds) {
    query = query.in('id', discussionIds);
  }

  const { data: discussions, error } = await query
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !discussions) {
    throw error || new Error('No discussions found');
  }

  // Batch fetch all unique user profiles
  const userIds = [...new Set(discussions.map(d => d.user_id))];
  const profileMap = await fetchBatchProfiles(userIds);

  // Combine discussions with their profiles
  return discussions.map(discussion => ({
    ...discussion,
    profiles: profileMap[discussion.user_id] || { username: null, display_name: null, avatar_url: null },
    _count: {
      comments: discussion.comment_count || 0,
      votes: {
        up: discussion.upvotes || 0,
        down: discussion.downvotes || 0
      }
    }
  }));
}
