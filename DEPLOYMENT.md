# 🚀 Production Polygon.io Caching System - Deployment Guide

## Overview

This document provides complete instructions for deploying the production-ready Polygon.io caching and rate-limiting system with Redis/Upstash integration.

## ✅ What's Been Implemented

### ✅ Core Features Completed

1. **Redis/Upstash Integration**: Shared caching with automatic fallback to in-memory LRU cache
2. **Configurable Cache TTL**: 5-minute default with symbol-specific multipliers (popular stocks get extended TTL)
3. **Batch Fetching**: Configurable batch sizes (5-10 symbols) for optimal API usage
4. **Rate Limiting**: Upgraded to 100-120 requests/minute with request queuing
5. **Circuit Breaker**: Automatic failure detection and graceful API degradation
6. **Exponential Backoff**: With jitter for retry handling (max 5 attempts)
7. **Cache Preloading**: Warm-up API for critical symbols on server startup

### ✅ Updated Components

- `src/lib/polygon-cache.ts`: Complete rewrite with Redis integration
- `src/app/api/preload-cache/route.ts`: Production-ready preload API
- `src/components/PolygonChart.tsx`: Enhanced with batch loading support
- `src/app/stocks/page.tsx`: Feed optimization with batch preloading

## 📋 Production Deployment Steps

### 1. Environment Variables Setup

Create/update your `.env.local` with the following:

```bash
# Polygon.io API Configuration (REQUIRED)
NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_api_key_here
POLYGON_API_KEY=your_polygon_api_key_here

# Redis Configuration (RECOMMENDED for production)
REDIS_URL=redis://username:password@hostname:port
# OR for Upstash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
```

### 2. Redis Setup Options

#### Option A: Upstash (Recommended for Vercel/Netlify)

```bash
# Create account at https://upstash.com
# Get your Redis REST URL
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
```

#### Option B: Redis Cloud/Local

```bash
# Install Redis locally (for development)
npm install -g redis-server
redis-server

# Or use Redis Cloud (https://redis.com/try-free)
REDIS_URL=redis://username:password@your-redis-host:port
```

#### Option C: Vercel KV (Redis-compatible)

Vercel automatically provides Redis-compatible KV storage in their platform.

### 3. Vercel Deployment (Recommended)

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
vercel login
```

#### Step 2: Configure Environment Variables
```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_POLYGON_API_KEY
vercel env add POLYGON_API_KEY
vercel env add UPSTASH_REDIS_REST_URL  # Or REDIS_URL
```

#### Step 3: Deploy
```bash
# Deploy to production
vercel --prod
```

### 4. Testing Production Deployment

#### Health Check Endpoint
```bash
# Check system health including Redis connectivity
GET https://your-domain.com/api/preload-cache/health
```

#### Cache Preload (Run after deployment)
```bash
# Warm up the cache for popular symbols
GET https://your-domain.com/api/preload-cache

# Or manually refresh specific symbols
POST https://your-domain.com/api/preload-cache
Content-Type: application/json
{
  "symbols": ["NVDA", "AAPL", "TSLA"],
  "timeRange": "1m",
  "batchSize": 8
}
```

#### Cache Stats Monitoring
```bash
# In browser console or via API
window.polygonCache.getStats()
```

## 🔧 Configuration Options

### Cache TTL Configuration

The system uses intelligent TTL based on symbol popularity:

```typescript
// In src/lib/polygon-cache.ts
const CACHE_SYMBOL_TTL_MULTIPLIER = {
  // Popular ETFs get 2x TTL
  'SPY': 2, 'QQQ': 2, 'IWM': 2,
  // Major stocks get extended cache
  'NVDA': 2, 'AAPL': 2, 'MSFT': 2, 'TSLA': 2,
  'GOOGL': 2, 'AMZN': 2, 'META': 2
};
```

### Rate Limiting (Premium Tier)

```typescript
// 120 requests/minute = 2 requests/second
MAX_REQUESTS_PER_MINUTE: 120
MAX_CONCURRENT_REQUESTS: 100
BATCH_SIZE_DEFAULT: 8  // Optimal batch size
```

### Circuit Breaker Settings

```typescript
CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5  // Failures before opening
CIRCUIT_BREAKER_RECOVERY_TIMEOUT: 60000  // 1 minute recovery
```

## 📊 Monitoring & Observability

### Cache Performance Metrics

```javascript
// Check cache performance
const stats = await window.polygonCache.getStats();
console.log(`
Redis Connected: ${stats.redisConnected}
Active Requests: ${stats.activeRequests}
Queued Requests: ${stats.queuedRequests}
Total Cache Keys: ${stats.totalKeys}
Circuit Breaker: ${stats.circuitBreaker.state}
Rate Limit: ${stats.rateLimit.requestsThisMinute}/${stats.rateLimit.limit}
`);
```

### Error Handling

The system gracefully handles:
- Polygon.io API outages (circuit breaker activates)
- Redis connection failures (fallback to in-memory cache)
- Rate limit violations (exponential backoff with jitter)
- Cache misses (automatic API fallback)

### Production Alerts (Recommended)

Monitor these patterns:
1. Circuit breaker state changes to "open"
2. Cache hit ratio drops below 80%
3. 429 status codes from Polygon.io API
4. Redis connection failures

## 🚀 Performance Optimizations

### For High-Concurrency Social Media Feeds

The system is optimized for handling hundreds of concurrent users:

1. **Shared Redis Cache**: All serverless instances share cache state
2. **Intelligent Batching**: Up to 10 symbols per batch request
3. **Request Queuing**: Prevents API rate limit violations
4. **Cache Warming**: Critical symbols preloaded on startup

### Cache Strategy Summary

```
Client Request → Redis Cache Check → Batch API Call → Cache Write → Response
    ↓                               ↓                    ↓           ↓
  Cache Hit? → No → Queue Request → API Fetched → Cache Miss → API Call
    ↓           ↓                   ↓             ↓            ↓
Response ← Yes ← Serve From Cache ← Cache Hit ← Serve From Cache
```

## 🔄 ISR/Revalidation Configuration

### Next.js ISR Setup (if using static generation)

```javascript
// In pages where charts are displayed
export const revalidate = 300; // 5 minutes - matches cache TTL
```

### Manual Cache Invalidation

```javascript
// For immediate cache refresh (admin operations)
await window.polygonCache.refresh('NVDA', '1m');
await window.polygonCache.refresh('AAPL', '24h');
```

## 🧪 Testing High-Concurrency Scenarios

### Load Testing Commands

```bash
# Test 100 concurrent users
ab -n 1000 -c 100 https://your-domain.com/api/preload-cache

# Test cache performance with popular symbols
curl -X GET "https://your-domain.com/api/preload-cache" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["SPY","NVDA","AAPL","MSFT","TSLA"],"timeRange":"1m"}'
```

## 🛡️ Production Security

### API Key Protection

1. Never expose `POLYGON_API_KEY` in client bundles
2. Use environment variables only
3. Rotate keys regularly
4. Monitor API usage in Polygon.io dashboard

### Rate Limiting Safety

The system includes multiple safety guards:
- Request throttling per serverless instance
- Global rate limiting via Redis coordination
- Circuit breaker prevents cascade failures
- Exponential backoff prevents thundering herd problems

## 📞 Support & Troubleshooting

### Common Issues

**Q: Chart showing mock data instead of real data?**
A: Check that `NEXT_PUBLIC_POLYGON_API_KEY` is set correctly.

**Q: Redis not connecting?**
A: Verify `REDIS_URL` or `UPSTASH_REDIS_REST_URL` format and credentials.

**Q: Rate limit errors?**
A: Check Polygon.io account tier limits and monitor `window.polygonCache.getStats()`.

**Q: Slow chart loading?**
A: Run cache preload API: `GET /api/preload-cache`

### Emergency Cache Operations

```javascript
// Force clear all cache
await window.polygonCache.clear();

// Emergency cache refresh for critical symbols
await window.polygonCache.warmup(['SPY', 'NVDA', 'AAPL'], ['1m', '1w']);
```

## 🎯 Production Readiness Checklist

- [ ] Environment variables configured (`POLYGON_API_KEY`, Redis URL)
- [ ] Redis connectivity verified
- [ ] Cache preload API tested (`GET /api/preload-cache`)
- [ ] Health check endpoint responding (`HEAD /api/preload-cache`)
- [ ] Circuit breaker in "closed" state
- [ ] Rate limits below threshold (<80% capacity)
- [ ] Cache hit ratio above 60%

## 🚦 Go-Live Monitoring (First 24 Hours)

1. Monitor error rates for Polygon.io API calls
2. Track cache hit ratios (>80% ideal)
3. Watch for circuit breaker state changes
4. Monitor response times (<200ms for cached requests)
5. Alert on rate limit violations

---

## 📞 Contact & Support

For issues with the production system:
1. Check browser console for polygonCache logs
2. Monitor `/api/preload-cache` health endpoint
3. Review Polygon.io API dashboard for rate limits
4. Check Redis/Upstash service status

The system is designed to handle thousands of concurrent users while staying within Polygon.io premium tier limits (100-120 req/min) with built-in circuit breaker protection and intelligent caching strategies.
