// Simple in-memory cache for Yahoo Finance using direct API calls
interface YahooChartData {
  t: number;
  c: number;
  o?: number;
  h?: number;
  l?: number;
  v?: number;
}

interface CacheEntry {
  data: YahooChartData[];
  timestamp: number;
  expiresAt: number;
}

class YahooFinanceCache {
  private static instance: YahooFinanceCache;
  private cache: Map<string, CacheEntry> = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes default

  static getInstance(): YahooFinanceCache {
    if (!YahooFinanceCache.instance) {
      YahooFinanceCache.instance = new YahooFinanceCache();
    }
    return YahooFinanceCache.instance;
  }

  async fetchChartData(symbol: string, range: string): Promise<YahooChartData[]> {
    const cacheKey = `${symbol}_${range}`;

    // Ensure symbol is uppercase
    symbol = symbol.toUpperCase();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`📊 Yahoo cache hit for ${symbol} (${range})`);
      return cached.data;
    }

    try {
      console.log(`📡 Yahoo Finance fetch: ${symbol} (${range})`);

      // Use our server-side API endpoint to bypass CORS
      const period = this.getRangeParam(range);
      const interval = this.getIntervalParam(range);

      // Check if we're in browser environment
      if (typeof window !== 'undefined') {
        // Use server-side API route
        const apiUrl = `/api/yahoo-finance?symbol=${encodeURIComponent(symbol)}&range=${period}&interval=${interval}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          console.warn(`📭 ${symbol}: API error ${response.status}`);
          return [];
        }

        const apiResponse = await response.json();
        const data = apiResponse.data || [];
        console.log(`✅ ${symbol}: Got ${data.length} data points from server API`);

        // Cache the result
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.ttl,
        });

        return data;
      } else {
        // Server-side direct fetch (fallback for SSR)
        const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${period}&interval=${interval}&includeAdjustedClose=true`;
        const response = await fetch(directUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          console.warn(`📭 ${symbol}: HTTP ${response.status} from Yahoo Finance`);
          return [];
        }

        const data = await response.json();

        if (!data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
          console.warn(`📭 ${symbol}: No quote data in response`);
          return [];
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const closes = quotes.close;
        const opens = quotes.open;
        const highs = quotes.high;
        const lows = quotes.low;
        const volumes = quotes.volume;

        if (!timestamps || !closes || closes.length === 0) {
          console.warn(`📭 ${symbol}: No valid data points`);
          return [];
        }

        console.log(`✅ ${symbol}: Got ${closes.length} data points from Yahoo Finance`);

        // Transform to our expected format
        const transformedData = closes.map((close: number, index: number) => ({
          t: timestamps[index] * 1000, // Convert to milliseconds
          c: close,
          o: opens[index] || close,
          h: highs[index] || close,
          l: lows[index] || close,
          v: volumes[index] || 0,
        }));

        return transformedData;
      }
    } catch (error) {
      console.error(`❌ Yahoo Finance error for ${symbol}:`, error);

      // Return empty array on error (matches Polygon behavior)
      return [];
    }
  }

  private getRangeParam(range: string): string {
    switch (range) {
      case '1h': return '1d';
      case '24h': return '1d';
      case '1w': return '5d';
      case '1m': return '1mo';
      case '1y': return '1y';
      case 'max': return 'max';
      default: return '1mo';
    }
  }

  private getIntervalParam(range: string): string {
    switch (range) {
      case '1h': return '1m';
      case '24h': return '5m';
      case '1w': return '15m';
      case '1m': return '1d';
      case '1y': return '1d';
      case 'max': return '1mo';
      default: return '1d';
    }
  }



  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Yahoo Finance cache cleared');
  }

  getCacheStats(): { entries: number; size: string } {
    const entries = this.cache.size;
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += JSON.stringify(entry.data).length;
    });

    return {
      entries,
      size: `${(totalSize / 1024).toFixed(2)} KB`
    };
  }
}



// Main export functions to match Polygon interface
export async function fetchYahooChartData(symbol: string, timeRange: string): Promise<YahooChartData[]> {
  const cache = YahooFinanceCache.getInstance();
  return cache.fetchChartData(symbol, timeRange);
}

// Batch fetch for multiple symbols (simplified)
export async function fetchMultipleYahooChartData(symbols: string[], timeRange: string): Promise<Record<string, YahooChartData[]>> {
  console.log(`🌐 Yahoo batch fetch for ${symbols.length} symbols`);

  const results: Record<string, YahooChartData[]> = {};
  const cache = YahooFinanceCache.getInstance();

  // Process sequentially to avoid rate limits
  for (const symbol of symbols) {
    try {
      // For batch, use the cache directly with the timeRange as-is
      results[symbol] = await cache.fetchChartData(symbol, timeRange);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Batch Yahoo fetch failed for ${symbol}:`, error);
      results[symbol] = [];
    }
  }

  return results;
}

// Cache management utilities
export const yahooCache = {
  getStats: () => YahooFinanceCache.getInstance().getCacheStats(),
  clear: () => YahooFinanceCache.getInstance().clearCache(),
};

// For debugging
if (typeof window !== 'undefined') {
  (window as any).yahooCache = yahooCache;
  console.log('🐛 Yahoo Finance cache debugging enabled. Use window.yahooCache in console.');
}

export default fetchYahooChartData;
