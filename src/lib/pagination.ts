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
  query: any,
  tableName: string,
  filters: Record<string, any>
): any {
  // For discussions table (equivalent to posts)
  if (tableName === 'discussions') {
    if (filters.id) {
      query = query.eq('id', filters.id);
    }
    if (filters.author_id) {
      query = query.eq('user_id', filters.author_id);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
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
