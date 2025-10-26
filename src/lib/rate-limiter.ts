import { NextRequest } from 'next/server';

// Simple in-memory rate limiter (for production, use Redis or similar)
interface RateLimitData {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitData> = new Map();

  // Clean up expired entries every 5 minutes
  constructor() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.limits.entries()) {
        if (now > data.resetTime) {
          this.limits.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  isAllowed(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60 * 60 * 1000 // 1 hour
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    const existing = this.limits.get(key);

    if (!existing) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime
      };
    }

    existing.count++;
    return {
      allowed: true,
      remaining: maxRequests - existing.count,
      resetTime: existing.resetTime
    };
  }

  // Get client IP address
  getClientIP(request: NextRequest): string {
    // Check common headers for IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    if (clientIP) {
      return clientIP;
    }

    // Fallback to a default (in production, this should be more sophisticated)
    return 'unknown';
  }

  // Get user ID from request (if authenticated)
  getUserId(request: NextRequest): string | null {
    // This would typically check for JWT token or session
    // For now, return null - implement based on your auth system
    return null;
  }

  // Generate identifier for rate limiting
  getIdentifier(request: NextRequest, key: string = 'default'): string {
    const ip = this.getClientIP(request);
    const userId = this.getUserId(request);

    if (userId) {
      return `user:${userId}:${key}`;
    }

    return `ip:${ip}:${key}`;
  }
}

export const rateLimiter = new RateLimiter();

// Middleware function for API routes
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
  options: {
    maxRequests?: number;
    windowMs?: number;
    key?: string;
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const {
      maxRequests = 100,
      windowMs = 60 * 60 * 1000, // 1 hour
      key = 'default'
    } = options;

    const identifier = rateLimiter.getIdentifier(request, key);
    const result = rateLimiter.isAllowed(identifier, maxRequests, windowMs);

    if (!result.allowed) {
      const resetDate = new Date(result.resetTime);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${resetDate.toISOString()}`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = await handler(request, ...args);

    // Clone response to add headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', maxRequests.toString());
    newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    newResponse.headers.set('X-RateLimit-Reset', result.resetTime.toString());

    return newResponse;
  };
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints
  GENERAL: { maxRequests: 1000, windowMs: 60 * 60 * 1000 }, // 1000/hour

  // Video uploads (more restrictive)
  UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour

  // Comments and likes (moderate)
  INTERACTION: { maxRequests: 100, windowMs: 60 * 1000 }, // 100/minute

  // Video views (very permissive)
  VIEW: { maxRequests: 10000, windowMs: 60 * 60 * 1000 }, // 10000/hour

  // Search (moderate)
  SEARCH: { maxRequests: 100, windowMs: 60 * 1000 }, // 100/minute
};
