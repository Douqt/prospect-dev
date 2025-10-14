import { LRUCache } from 'lru-cache';

// In-memory cache configuration
interface PolygonCacheValue {
  data: PolygonResponse['results'];
  timestamp: number;
  symbol: string;
  timeRange: string;
}

const cache = new LRUCache<string, PolygonCacheValue>({
  max: 500, // Maximum number of entries
  ttl: 60 * 1000, // 60 second TTL (adjustable)
  ttlAutopurge: true,
});

// Rate limiting configuration
interface RateLimiter {
  tokens: number;
  lastRefill: number;
  refillRate: number; // tokens per minute
}

const rateLimiter: Map<string, RateLimiter> = new Map();

// Global rate limiter (5 requests per minute)
const getGlobalRateLimiter = (): RateLimiter => {
  const key = 'global';
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, {
      tokens: 5, // 5 requests per minute
      lastRefill: Date.now(),
      refillRate: 5,
    });
  }
  return rateLimiter.get(key)!;
};

// Exponential backoff configuration
const initialDelay = 1000; // 1 second
const maxDelay = 30000; // 30 seconds
const backoffFactor = 2;

// API Response types
interface PolygonResponse {
  results: Array<{
    t: number; // timestamp
    c: number; // close price
  }>;
}

interface CachedResponse {
  data: PolygonResponse['results'];
  timestamp: number;
  symbol: string;
  timeRange: string;
}

interface PolygonChartData {
  t: number;
  c: number;
  o?: number;
  h?: number;
  l?: number;
  v?: number;
}

class PolygonAPIManager {
  private static instance: PolygonAPIManager;
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io/v2/aggs/ticker';

  private constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY || '';
    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      console.warn('Polygon.io API key not found. Charts will use mock data.');
    }
  }

  static getInstance(): PolygonAPIManager {
    if (!PolygonAPIManager.instance) {
      PolygonAPIManager.instance = new PolygonAPIManager();
    }
    return PolygonAPIManager.instance;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async acquireToken(): Promise<boolean> {
    const now = Date.now();
    const limiter = getGlobalRateLimiter();

    // Refill tokens based on time elapsed
    const elapsed = now - limiter.lastRefill;
    const refillAmount = Math.floor((elapsed / 60000) * limiter.refillRate); // per minute rate

    limiter.tokens = Math.min(5, limiter.tokens + refillAmount);
    limiter.lastRefill = now;

    if (limiter.tokens <= 0) {
      return false; // No tokens available
    }

    limiter.tokens -= 1;
    return true;
  }

  private async fetchWithRetry(
    url: string,
    maxRetries = 3
  ): Promise<Response> {
    let delay = initialDelay;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check rate limit
        if (!(await this.acquireToken())) {
          const waitTime = 60000 - (Date.now() - getGlobalRateLimiter().lastRefill);
          console.warn(`Rate limited. Waiting ${waitTime}ms before retry.`);
          await this.delay(waitTime);
          continue;
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NextJS-TradingApp/1.0'
          }
        });

        // Handle specific status codes
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

          console.warn(`Polygon.io rate limit hit (429). Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}.`);
          if (attempt < maxRetries - 1) {
            await this.delay(waitTime);
            delay = Math.min(delay * backoffFactor, maxDelay);
            continue;
          }
        }

        if (response.status === 403) {
          throw new Error('Polygon.io API key invalid or insufficient permissions');
        }

        return response;

      } catch (error) {
        lastError = error as Error;
        console.error(`Fetch attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          console.log(`Retrying in ${delay}ms...`);
          await this.delay(delay);
          delay = Math.min(delay * backoffFactor, maxDelay);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  async fetchChartData(
    symbol: string,
    timeRange: string
  ): Promise<PolygonResponse['results']> {
    const cacheKey = `polygon:${symbol}:${timeRange}`;

    // Check cache first
    const cached = cache.get(cacheKey) as CachedResponse | undefined;
    if (cached && Date.now() - cached.timestamp < 60 * 1000) { // 60 second cache
      console.log(`🔄 Using cached data for ${symbol} (${timeRange})`);
      return cached.data;
    }

    // Calculate date range based on time range
    const now = new Date();
    let fromDate: Date;
    let toDate = now;
    let multiplier = 1;
    let timespan = 'day';

    switch (timeRange) {
      case '1h':
        timespan = 'minute';
        multiplier = 60;
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        timespan = 'hour';
        multiplier = 1;
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        timespan = 'hour';
        multiplier = 4;
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        timespan = 'day';
        multiplier = 1;
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        timespan = 'week';
        multiplier = 1;
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'max':
        timespan = 'month';
        multiplier = 1;
        const maxFromDate = new Date('2010-01-01');
        fromDate = maxFromDate;
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    const url = `${this.baseUrl}/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${fromDateStr}/${toDateStr}?apiKey=${this.apiKey}&adjusted=true&sort=asc&limit=50000`;

    console.log(`📡 Fetching ${symbol.toUpperCase()} chart data (${timeRange}) from Polygon.io`);

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        // For 404/not found, it's not really an error for a symbol
        if (response.status === 404) {
          console.warn(`Symbol ${symbol.toUpperCase()} not found on Polygon.io, returning empty data`);
          const emptyData: PolygonResponse['results'] = [];
          cache.set(cacheKey, {
            data: emptyData,
            timestamp: Date.now(),
            symbol,
            timeRange
          });
          return emptyData;
        }
        throw new Error(`Polygon.io API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as PolygonResponse;

      if (result.results && result.results.length > 0) {
        const chartData = result.results;

        // Cache the response
        cache.set(cacheKey, {
          data: chartData,
          timestamp: Date.now(),
          symbol,
          timeRange
        });

        console.log(`✅ Successfully fetched ${chartData.length} data points for ${symbol.toUpperCase()}`);
        return chartData;
      } else {
        console.warn(`No data returned from Polygon.io for ${symbol.toUpperCase()}, returning empty data`);
        const emptyData: PolygonResponse['results'] = [];
        cache.set(cacheKey, {
          data: emptyData,
          timestamp: Date.now(),
          symbol,
          timeRange
        });
        return emptyData;
      }
    } catch (error) {
      console.error(`Failed to fetch ${symbol.toUpperCase()} data:`, error);

      // For network errors, still cache empty data for a shorter time
      const emptyData: PolygonResponse['results'] = [];
      cache.set(cacheKey, {
        data: emptyData,
        timestamp: Date.now() - 50 * 1000, // Cache for only 10 seconds on error
        symbol,
        timeRange
      });

      throw error;
    }
  }
}

// Main export function - this is the single API entry point
export async function fetchPolygonData(symbol: string, timeRange: string): Promise<PolygonResponse['results']> {
  const manager = PolygonAPIManager.getInstance();
  return manager.fetchChartData(symbol, timeRange);
}

// Utility function to get cache stats
export function getPolygonCacheStats() {
  return {
    size: cache.size,
    remainingTTL: Array.from(cache.entries()).map(([key, value]) => ({
      key,
      ttl: Math.max(0, 60 * 1000 - (Date.now() - (value as CachedResponse).timestamp))
    }))
  };
}

// Utility function to clear cache (useful for testing)
export function clearPolygonCache() {
  cache.clear();
  console.log('Polygon.io cache cleared');
}
