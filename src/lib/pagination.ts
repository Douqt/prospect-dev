// Helper functions for cursor-based pagination
export interface CursorPaginationOptions {
  limit?: number;
  cursor?: string;
  direction?: 'next' | 'prev';
}

export function getNextCursor<T extends { created_at: string }>(data: T[]): string | null {
  if (!data || data.length === 0) return null;
  return data[data.length - 1]?.created_at || null;
}

export function getPrevCursor<T extends { created_at: string }>(data: T[]): string | null {
  if (!data || data.length === 0) return null;
  return data[0]?.created_at || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCursorQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: Record<string, any>,
  options: CursorPaginationOptions & { orderColumn?: string } = {}
) {
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

// Helper to add indexed filter conditions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addIndexedFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  tableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: Record<string, any>
) {
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

// Helper for full-text search using tsvector column
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addFullTextSearch<T extends Record<string, any>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  searchQuery: string,
  options: { column?: string; language?: string } = {}
) {
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
