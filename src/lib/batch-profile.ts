import { supabase } from "./supabaseClient";

/**
 * Profile data structure for batch operations
 */
export interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * Map of user IDs to profile data for efficient lookups
 */
export type ProfileMap = Record<string, Profile>;

/**
 * Batch fetch profiles for multiple user IDs
 * Optimizes N+1 query problem by fetching all profiles in a single request
 * @param userIds - Array of user IDs to fetch profiles for
 * @returns Promise resolving to a map of user ID to profile data
 * @example
 * const profiles = await fetchBatchProfiles(['user1', 'user2']);
 * console.log(profiles['user1']); // { id: 'user1', username: 'john', ... }
 */
export async function fetchBatchProfiles(userIds: string[]): Promise<ProfileMap> {
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
    const profileMap: ProfileMap = {};
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
 * Discussion data structure with profile information
 */
export interface DiscussionWithProfile {
  id: string;
  title: string;
  content: string;
  user_id: string;
  image_url?: string;
  category: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  profiles: Profile;
  _count: {
    comments: number;
    votes: {
      up: number;
      down: number;
    };
  };
}

/**
 * Enhanced discussion fetcher that includes batch profile loading
 * Fetches discussions and their associated user profiles in optimized batch operations
 * @param discussionIds - Optional array of specific discussion IDs to fetch
 * @returns Promise resolving to discussions with embedded profile data
 * @throws Error if discussions cannot be fetched
 */
export async function fetchDiscussionsWithProfiles(discussionIds?: string[]): Promise<DiscussionWithProfile[]> {
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
    profiles: profileMap[discussion.user_id] || { id: discussion.user_id, username: null, display_name: null, avatar_url: null },
    _count: {
      comments: discussion.comment_count || 0,
      votes: {
        up: discussion.upvotes || 0,
        down: discussion.downvotes || 0
      }
    }
  }));
}
