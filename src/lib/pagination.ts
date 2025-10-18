import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Options for cursor-based pagination
 */
export interface CursorPaginationOptions {
  /** Maximum number of items to fetch (default: 20) */
  limit?: number;
  /** Cursor for pagination (timestamp string) */
  cursor?: string;
  /** Direction of pagination */
  direction?: 'next' | 'prev';
}

/**
 * Options for efficient community queries with proper indexing
 */
export interface CommunityQueryOptions {
  /** User ID for filtering user's communities */
  userId?: string;
  /** Community symbol for filtering specific community */
  communitySymbol?: string;
  /** Pagination options */
  pagination?: CursorPaginationOptions;
  /** Whether to include community stats */
  includeStats?: boolean;
}

/**
 * Generic type for items with created_at timestamp
 */
export type TimestampedItem = {
  created_at: string;
};

/**
 * Gets the next cursor for forward pagination
 * Uses the created_at timestamp of the last item
 * @param data - Array of items with created_at field
 * @returns Next cursor timestamp or null if no data
 */
export function getNextCursor<T extends TimestampedItem>(data: T[]): string | null {
  if (!data || data.length === 0) return null;
  return data[data.length - 1]?.created_at || null;
}

/**
 * Gets the previous cursor for backward pagination
 * Uses the created_at timestamp of the first item
 * @param data - Array of items with created_at field
 * @returns Previous cursor timestamp or null if no data
 */
export function getPrevCursor<T extends TimestampedItem>(data: T[]): string | null {
  if (!data || data.length === 0) return null;
  return data[0]?.created_at || null;
}

/**
 * Builds a cursor-based pagination query for Supabase
 * @param query - Supabase query builder instance
 * @param options - Pagination options and configuration
 * @returns Modified query with pagination applied
 */
export function buildCursorQuery(
  query: any,
  options: CursorPaginationOptions & { orderColumn?: string } = {}
): any {
  const { limit = 20, cursor, direction = 'next', orderColumn = 'created_at' } = options;

  // Set default ordering for newest first
  query = query.order(orderColumn, { ascending: false });

  if (cursor) {
    if (direction === 'next') {
      // Load older posts (pagination forward)
      query = query.lt(orderColumn, cursor);
    } else {
      // Load newer posts (pagination backward)
      query = query.gt(orderColumn, cursor);
    }
  }

  return query.limit(limit);
}

/**
 * Table name type for type safety
 */
export type TableName = 'discussions' | 'comments' | 'profiles' | 'community_memberships' | 'user_post_views';

/**
 * Filter options for different table types
 */
export type TableFilters =
  | { table: 'discussions'; filters: { id?: string; author_id?: string; category?: string } }
  | { table: 'comments'; filters: { post_id?: string; parent_id?: string; author_id?: string } }
  | { table: 'profiles'; filters: { user_id?: string; username?: string } }
  | { table: 'community_memberships'; filters: { user_id?: string; community_symbol?: string } }
  | { table: 'user_post_views'; filters: { user_id?: string; post_id?: string } };

/**
 * Adds indexed filter conditions to a Supabase query
 * Applies table-specific filters for optimal query performance using database indexes
 * @param query - Supabase query builder instance
 * @param tableName - Name of the table being queried
 * @param filters - Filter conditions to apply
 * @returns Modified query with filters applied
 */
export function addIndexedFilter(
  query: ReturnType<SupabaseClient['from']>,
  tableName: string,
  filters: Record<string, string | string[] | undefined>
): ReturnType<SupabaseClient['from']> {
  // For discussions table (equivalent to posts)
  if (tableName === 'discussions') {
    if (filters.id) {
      query = query.eq('id', filters.id);
    }
    if (filters.author_id) {
      query = query.eq('user_id', filters.author_id);
    }
    if (filters.category) {
      // Handle both single category and array of categories
      if (Array.isArray(filters.category)) {
        query = query.in('category', filters.category);
      } else {
        query = query.eq('category', filters.category);
      }
    }
  }

  // For comments table
  if (tableName === 'comments') {
    if (filters.post_id) {
      query = query.eq('discussion_id', filters.post_id);
    }
    if (filters.parent_id) {
      query = query.eq('parent_id', filters.parent_id);
    }
    if (filters.author_id) {
      query = query.eq('user_id', filters.author_id);
    }
  }

  // For profiles table
  if (tableName === 'profiles') {
    if (filters.user_id) {
      query = query.eq('id', filters.user_id);
    }
    if (filters.username) {
      query = query.eq('username', filters.username);
    }
  }

  // For community_memberships table
  if (tableName === 'community_memberships') {
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.community_symbol) {
      query = query.eq('community_symbol', filters.community_symbol);
    }
  }

  // For user_post_views table
  if (tableName === 'user_post_views') {
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.post_id) {
      query = query.eq('post_id', filters.post_id);
    }
  }

  return query;
}

/**
 * Options for full-text search configuration
 */
export interface FullTextSearchOptions {
  /** Column name containing the tsvector (default: 'searchable') */
  column?: string;
  /** Language for text search configuration (default: 'english') */
  language?: string;
}

/**
 * Adds full-text search capability to a Supabase query
 * Uses PostgreSQL's tsvector for efficient text search with websearch type
 * @param query - Supabase query builder instance
 * @param searchQuery - Search query string
 * @param options - Search configuration options
 * @returns Modified query with full-text search applied
 */
export function addFullTextSearch(
  query: any,
  searchQuery: string,
  options: FullTextSearchOptions = {}
): any {
  const { column = 'searchable', language = 'english' } = options;

  if (!searchQuery || searchQuery.trim().length === 0) {
    return query;
  }

  // Use Supabase's textSearch function with tsvector column
  return query.textSearch(column, searchQuery.trim(), {
    type: 'websearch', // Use websearch for better search behavior
    config: language
  });
}

/**
 * Efficiently queries user's communities with optimized joins
 * Uses primary key (user_id, community_symbol) for fast lookups
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch communities for
 * @param options - Query options including pagination
 * @returns Promise with communities data and pagination info
 */
export async function getUserCommunities(
  supabase: SupabaseClient,
  userId: string,
  options: CommunityQueryOptions = {}
): Promise<{
  data: Array<{
    community_symbol: string;
    followed_at: string;
    community_stats: {
      member_count: number;
      post_count: number;
      last_activity: string;
    } | null;
  }>;
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
}> {
  const { pagination = {} } = options;
  const { limit = 50, cursor, direction = 'next' } = pagination;

  // Build the efficient join query using primary key index
  let query = supabase
    .from('community_memberships')
    .select(`
      community_symbol,
      followed_at,
      community_stats!inner (
        member_count,
        post_count,
        last_activity
      )
    `)
    .eq('user_id', userId);

  // Apply cursor pagination using followed_at timestamp
  if (cursor) {
    if (direction === 'next') {
      query = query.lt('followed_at', cursor);
    } else {
      query = query.gt('followed_at', cursor);
    }
  }

  query = query
    .order('followed_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there are more

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch user communities: ${error.message}`);
  }

  // Handle pagination
  const hasMore = data && data.length > limit;
  const communities = hasMore ? data.slice(0, limit) : data;

  return {
    data: communities || [],
    nextCursor: hasMore && communities.length > 0 ? communities[communities.length - 1].followed_at : null,
    prevCursor: communities.length > 0 ? communities[0].followed_at : null,
    hasMore
  };
}

/**
 * Efficiently queries all users in a specific community
 * Uses secondary index (community_symbol, user_id) for fast lookups
 * @param supabase - Supabase client instance
 * @param communitySymbol - Community symbol to fetch users for
 * @param options - Query options including pagination
 * @returns Promise with users data and pagination info
 */
export async function getCommunityUsers(
  supabase: SupabaseClient,
  communitySymbol: string,
  options: CommunityQueryOptions = {}
): Promise<{
  data: Array<{
    user_id: string;
    followed_at: string;
    profiles: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasMore: boolean;
}> {
  const { pagination = {} } = options;
  const { limit = 50, cursor, direction = 'next' } = pagination;

  // Build query using secondary index (community_symbol, user_id)
  let query = supabase
    .from('community_memberships')
    .select(`
      user_id,
      followed_at,
      profiles!inner (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('community_symbol', communitySymbol.toLowerCase());

  // Apply cursor pagination using followed_at timestamp
  if (cursor) {
    if (direction === 'next') {
      query = query.lt('followed_at', cursor);
    } else {
      query = query.gt('followed_at', cursor);
    }
  }

  query = query
    .order('followed_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there are more

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch community users: ${error.message}`);
  }

  // Handle pagination
  const hasMore = data && data.length > limit;
  const users = hasMore ? data.slice(0, limit) : data;

  return {
    data: users || [],
    nextCursor: hasMore && users.length > 0 ? users[users.length - 1].followed_at : null,
    prevCursor: users.length > 0 ? users[0].followed_at : null,
    hasMore
  };
}

/**
 * Optimized query for community statistics with caching support
 * Uses community_stats table for fast access to member and post counts
 * @param supabase - Supabase client instance
 * @param communitySymbol - Community symbol to get stats for
 * @returns Promise with community statistics
 */
export async function getCommunityStats(
  supabase: SupabaseClient,
  communitySymbol: string
): Promise<{
  member_count: number;
  post_count: number;
  last_activity: string;
} | null> {
  const { data, error } = await supabase
    .from('community_stats')
    .select('member_count, post_count, last_activity')
    .eq('community_symbol', communitySymbol.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to fetch community stats: ${error.message}`);
  }

  return data;
}

/**
 * Updates community statistics efficiently
 * Handles both member count changes and post count recalculation
 * @param supabase - Supabase client instance
 * @param communitySymbol - Community symbol to update
 * @param action - 'follow' or 'unfollow' action
 * @returns Promise with updated statistics
 */
export async function updateCommunityStats(
  supabase: SupabaseClient,
  communitySymbol: string,
  action: 'follow' | 'unfollow'
): Promise<{
  member_count: number;
  post_count: number;
}> {
  const lowerSymbol = communitySymbol.toLowerCase();

  // Get current stats
  const currentStats = await getCommunityStats(supabase, lowerSymbol);

  // Calculate new member count
  const newMemberCount = currentStats
    ? (action === 'follow' ? currentStats.member_count + 1 : Math.max(0, currentStats.member_count - 1))
    : (action === 'follow' ? 1 : 0);

  // Recalculate post count from discussions table
  const { count: postCount } = await supabase
    .from('discussions')
    .select('*', { count: 'exact', head: true })
    .eq('category', lowerSymbol);

  const newPostCount = postCount || 0;

  // Update community_stats table
  const { error } = await supabase
    .from('community_stats')
    .upsert({
      community_symbol: lowerSymbol,
      member_count: newMemberCount,
      post_count: newPostCount,
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'community_symbol'
    });

  if (error) {
    throw new Error(`Failed to update community stats: ${error.message}`);
  }

  return {
    member_count: newMemberCount,
    post_count: newPostCount
  };
}
