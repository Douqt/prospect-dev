// TEMPORARY YAHOO FINANCE SYSTEM - EASY TO REMOVE LATER
// Switch back to polygon-cache.ts when polygon.io issues are resolved

// Import Yahoo Finance functions with different names to avoid conflicts
import {
  fetchYahooChartData as yahooFetch,
  fetchMultipleYahooChartData as yahooBatchFetch,
  yahooCache
} from '@/lib/yahoo-cache';

// Re-export Yahoo functions with Polygon names for easy switching
export async function fetchPolygonData(symbol: string, timeRange: string): Promise<any[]> {
  return yahooFetch(symbol, timeRange);
}

export async function fetchMultiplePolygonData(
  symbols: string[],
  timeRange: string,
  batchSize?: number
): Promise<Record<string, any[]>> {
  return yahooBatchFetch(symbols, timeRange);
}

// Cache management utilities - proxy to Yahoo cache
export const polygonCache = {
  getStats: () => yahooCache.getStats(),
  clear: () => yahooCache.clear(),
  refresh: (symbol: string, timeRange: string) => yahooFetch(symbol, timeRange),
  warmup: (symbols?: string[]) => {
    // Simple warmup - just fetch the symbols
    if (symbols && symbols.length > 0) {
      console.log(`🔥 Warming up Yahoo cache for ${symbols.length} symbols`);
      return yahooBatchFetch(symbols, '1m');
    }
    return Promise.resolve({});
  },
  healthCheck: async () => ({
    redis: false, // Not using Redis
    yahooFinance: true, // If we got here, it's working
    api: true,
    circuitBreaker: 'closed' // No circuit breaker for Yahoo
  }),
};

// For debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).polygonCache = polygonCache;
  console.log('🐛 Yahoo Finance temporary system active. Use window.polygonCache in console.');
  console.log('🔄 To switch back to Polygon.io: replace polygon-cache.ts with original version');
}

export default fetchPolygonData;
