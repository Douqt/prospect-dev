/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  ttl?: number;
  /** Cache key prefix for namespacing */
  prefix?: string;
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/**
 * In-memory cache implementation for development and small-scale deployments
 * For production, consider using Redis or similar distributed cache
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 300; // 5 minutes

  /**
   * Sets a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Gets a value from the cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Deletes a value from the cache
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   * @returns Object with cache size and hit/miss info
   */
  getStats(): { size: number } {
    return {
      size: this.cache.size
    };
  }
}

/**
 * Global cache instance
 */
const memoryCache = new MemoryCache();

/**
 * Cache utility functions for community data
 */
export class CommunityCache {
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly USER_COMMUNITIES_PREFIX = 'user_communities';
  private static readonly COMMUNITY_USERS_PREFIX = 'community_users';
  private static readonly COMMUNITY_STATS_PREFIX = 'community_stats';

  /**
   * Generates a cache key for user communities
   * @param userId - User ID
   * @param options - Query options that affect the cache key
   * @returns Cache key string
   */
  private static getUserCommunitiesKey(userId: string, options: any = {}): string {
    const { limit = 50, cursor, direction = 'next' } = options.pagination || {};
    return `${this.USER_COMMUNITIES_PREFIX}:${userId}:${limit}:${cursor || 'start'}:${direction}`;
  }

  /**
   * Generates a cache key for community users
   * @param communitySymbol - Community symbol
   * @param options - Query options that affect the cache key
   * @returns Cache key string
   */
  private static getCommunityUsersKey(communitySymbol: string, options: any = {}): string {
    const { limit = 50, cursor, direction = 'next' } = options.pagination || {};
    return `${this.COMMUNITY_USERS_PREFIX}:${communitySymbol.toLowerCase()}:${limit}:${cursor || 'start'}:${direction}`;
  }

  /**
   * Generates a cache key for community stats
   * @param communitySymbol - Community symbol
   * @returns Cache key string
   */
  private static getCommunityStatsKey(communitySymbol: string): string {
    return `${this.COMMUNITY_STATS_PREFIX}:${communitySymbol.toLowerCase()}`;
  }

  /**
   * Caches user communities data
   * @param userId - User ID
   * @param options - Query options
   * @param data - Communities data to cache
   * @param options.cacheOptions - Cache configuration
   */
  static setUserCommunities(
    userId: string,
    options: any,
    data: any,
    cacheOptions: CacheOptions = {}
  ): void {
    const key = this.getUserCommunitiesKey(userId, options);
    const ttl = cacheOptions.ttl || this.DEFAULT_TTL;
    memoryCache.set(key, data, ttl);
  }

  /**
   * Gets cached user communities data
   * @param userId - User ID
   * @param options - Query options
   * @returns Cached data or null if not found
   */
  static getUserCommunities(userId: string, options: any): any | null {
    const key = this.getUserCommunitiesKey(userId, options);
    return memoryCache.get(key);
  }

  /**
   * Caches community users data
   * @param communitySymbol - Community symbol
   * @param options - Query options
   * @param data - Users data to cache
   * @param cacheOptions - Cache configuration
   */
  static setCommunityUsers(
    communitySymbol: string,
    options: any,
    data: any,
    cacheOptions: CacheOptions = {}
  ): void {
    const key = this.getCommunityUsersKey(communitySymbol, options);
    const ttl = cacheOptions.ttl || this.DEFAULT_TTL;
    memoryCache.set(key, data, ttl);
  }

  /**
   * Gets cached community users data
   * @param communitySymbol - Community symbol
   * @param options - Query options
   * @returns Cached data or null if not found
   */
  static getCommunityUsers(communitySymbol: string, options: any): any | null {
    const key = this.getCommunityUsersKey(communitySymbol, options);
    return memoryCache.get(key);
  }

  /**
   * Caches community statistics
   * @param communitySymbol - Community symbol
   * @param stats - Statistics data to cache
   * @param cacheOptions - Cache configuration
   */
  static setCommunityStats(
    communitySymbol: string,
    stats: any,
    cacheOptions: CacheOptions = {}
  ): void {
    const key = this.getCommunityStatsKey(communitySymbol);
    const ttl = cacheOptions.ttl || this.DEFAULT_TTL;
    memoryCache.set(key, stats, ttl);
  }

  /**
   * Gets cached community statistics
   * @param communitySymbol - Community symbol
   * @returns Cached stats or null if not found
   */
  static getCommunityStats(communitySymbol: string): any | null {
    const key = this.getCommunityStatsKey(communitySymbol);
    return memoryCache.get(key);
  }

  /**
   * Invalidates cache for a specific user
   * @param userId - User ID to invalidate cache for
   */
  static invalidateUserCache(userId: string): void {
    // For simplicity, we'll clear all cache when user data changes
    // In a production system, you'd want more granular invalidation
    memoryCache.clear();
  }

  /**
   * Invalidates cache for a specific community
   * @param communitySymbol - Community symbol to invalidate cache for
   */
  static invalidateCommunityCache(communitySymbol: string): void {
    // For simplicity, we'll clear all cache when community data changes
    // In a production system, you'd want more granular invalidation
    memoryCache.clear();
  }

  /**
   * Gets cache statistics for monitoring
   * @returns Cache statistics
   */
  static getCacheStats() {
    return memoryCache.getStats();
  }

  /**
   * Clears all cached data
   */
  static clearAll(): void {
    memoryCache.clear();
  }

  /**
   * Clears cache for a specific user across all cache types
   * @param userId - User ID to clear cache for
   */
  static clearUserCache(userId: string): void {
    // For simplicity, we'll clear all cache when user data changes
    // In a production system, you'd want more granular invalidation
    memoryCache.clear();
  }

  /**
   * Clears cache for a specific community across all cache types
   * @param communitySymbol - Community symbol to clear cache for
   */
  static clearCommunityCache(communitySymbol: string): void {
    // For simplicity, we'll clear all cache when community data changes
    // In a production system, you'd want more granular invalidation
    memoryCache.clear();
  }
}

/**
 * Higher-order function to add caching to community queries
 * @param fn - Function to cache results for
 * @param getKey - Function to generate cache key
 * @param options - Cache options
 * @returns Cached version of the function
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getKey: (args: T) => string,
  options: CacheOptions = {}
) {
  return async (...args: T): Promise<R> => {
    const key = getKey(args);
    const ttl = options.ttl || CommunityCache['DEFAULT_TTL'];

    // Try to get from cache first
    const cached = memoryCache.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    memoryCache.set(key, result, ttl);

    return result;
  };
}

export default memoryCache;
