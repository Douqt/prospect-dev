import { NextRequest, NextResponse } from 'next/server';
import { fetchMultiplePolygonData, polygonCache } from '@/lib/polygon-cache';

// Production-ready preload configuration
const COMMON_SYMBOLS = [
  // Popular stocks
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NFLX',
  // ETFs
  'SPY', 'QQQ', 'IWM',
  // Financial indicators
  'VIX', 'TNX'
];

// Batch sizes optimized for production deployment
const PRELOAD_BATCH_SIZE = 8; // Match cache manager's default
const WARMUP_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ'];

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting production cache preload for common symbols...');

    const startTime = Date.now();
    const results: Record<string, unknown> = {};
    const stats = {
      redisConnected: false,
      totalSymbols: 0,
      cachedSymbols: 0,
      apiRequests: 0,
      cacheHits: 0,
      errors: 0
    };

    // Check cache health first
    const healthCheck = await polygonCache.healthCheck();
    stats.redisConnected = healthCheck.yahooFinance || false;

    // Preload in optimized batches for production
    const timeRanges = ['1m', '1w', '24h'];
    const symbols = COMMON_SYMBOLS.slice(0, 15); // Limit for production startup

    for (const timeRange of timeRanges) {
      console.log(`📊 Preloading ${timeRange} charts for ${symbols.length} symbols...`);

      const batchResults = await fetchMultiplePolygonData(symbols, timeRange, PRELOAD_BATCH_SIZE);

      const symbolStats = Object.entries(batchResults).map(([symbol, data]) => ({
        symbol,
        dataPoints: data.length,
        cached: data.length > 0 // Approximation based on data presence
      }));

      results[timeRange] = {
        totalSymbols: symbols.length,
        symbols: symbolStats,
        successCount: symbolStats.filter(s => s.dataPoints > 0).length,
        failureCount: symbolStats.filter(s => s.dataPoints === 0).length,
        totalDataPoints: symbolStats.reduce((sum, s) => sum + s.dataPoints, 0)
      };

      await new Promise(resolve => setTimeout(resolve, 100)); // Minimal pause
    }

    // After initial preload, perform cache warmup for critical symbols
    console.log('🔥 Performing cache warmup for critical symbols...');
    try {
      await polygonCache.warmup(WARMUP_SYMBOLS);
      console.log('✅ Cache warmup completed');
    } catch (warmupError) {
      console.warn('⚠️ Cache warmup warning:', warmupError);
    }

    const elapsed = Date.now() - startTime;
    const cacheStats = await polygonCache.getStats();

    return NextResponse.json({
      success: true,
      message: 'Production cache preload completed',
      stats: {
        ...stats,
        elapsedMs: elapsed,
        cacheStats,
        preloadInfo: {
          symbolsPreloaded: symbols.length,
          timeRangesCovered: timeRanges.length,
          warmupSymbols: WARMUP_SYMBOLS.length
        },
        healthCheck,
        nextSteps: [
          'Cache is ready for high-volume traffic',
          'Monitor circuit breaker and rate limits',
          'Consider cron-based cache refresh for optimal performance'
        ]
      },
      results,
    }, {
      headers: {
        'Cache-Control': 'no-cache', // Don't cache API responses
        'CDN-Cache-Control': 'max-age=0'
      }
    });

  } catch (error) {
    console.error('❌ Production cache preload failed:', error);

    // Attempt emergency cache clear on critical failure
    try {
      await polygonCache.clear();
      console.log('🧹 Emergency cache clear completed');
    } catch (clearError) {
      console.error('❌ Emergency cache clear also failed:', clearError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Production cache preload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        recovery: 'Cache cleared. System will retry on next request.',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      symbols = COMMON_SYMBOLS,
      timeRange = '1m',
      batchSize = PRELOAD_BATCH_SIZE,
      force = false,
      priority = 'normal'
    } = body;

    const operation = force ? 'forced cache refresh' : 'manual cache refresh';
    console.log(`🔄 ${operation} for ${symbols.length} symbols (${timeRange}) batchSize=${batchSize}`);

    const startTime = Date.now();
    const results = await fetchMultiplePolygonData(symbols, timeRange, batchSize);
    const elapsed = Date.now() - startTime;

    // Get detailed cache statistics
    const cacheStats = await polygonCache.getStats();

    const symbolResults = Object.entries(results).map(([symbol, data]) => ({
      symbol,
      dataPoints: data.length,
      success: data.length > 0,
      fromCache: cacheStats ? 'redisConnected' in cacheStats && cacheStats.redisConnected : false
    }));

    return NextResponse.json({
      success: true,
      message: `${operation} completed`,
      stats: {
        symbols: symbols.length,
        timeRange,
        batchSize: batchSize || PRELOAD_BATCH_SIZE,
        elapsedMs: elapsed,
        successCount: symbolResults.filter(r => r.success).length,
        failureCount: symbolResults.filter(r => !r.success).length,
        totalDataPoints: symbolResults.reduce((sum, r) => sum + r.dataPoints, 0),
        cacheStats,
        operation
      },
      results: {
        successSymbols: symbolResults.filter(r => r.success),
        failureSymbols: symbolResults.filter(r => !r.success),
        summary: {
          totalCached: symbolResults.filter(r => r.fromCache).length,
          totalFetched: symbolResults.length - symbolResults.filter(r => r.fromCache).length
        }
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'CDN-Cache-Control': 'max-age=0' // Prevent CDN caching of dynamic responses
      }
    });

  } catch (error) {
    console.error('❌ Manual cache refresh failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Manual cache refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Check Polygon.io API key configuration',
          'Verify Redis/Upstash connection',
          'Monitor circuit breaker status',
          'Check rate limits on Polygon.io account'
        ]
      },
      { status: 500 }
    );
  }
}

// Health check endpoint for monitoring systems
export async function HEAD(request: NextRequest) {
  try {
    const health = await polygonCache.healthCheck();
    const status = health.yahooFinance && health.api ? 200 : 503;
    return new Response(null, { status });
  } catch {
    return new Response(null, { status: 503 });
  }
}
