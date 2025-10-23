/**
 * Security Middleware
 * Provides security headers and request validation
 */

import { NextRequest, NextResponse } from 'next/server';

export interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXSSProtection: boolean;
  enableFrameOptions: boolean;
  enableReferrerPolicy: boolean;
  enableContentTypeOptions: boolean;
  maxRequestSize: number; // in bytes
  rateLimitWindow: number; // in milliseconds
  rateLimitMax: number; // max requests per window
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXSSProtection: true,
  enableFrameOptions: true,
  enableReferrerPolicy: true,
  enableContentTypeOptions: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // 100 requests per 15 minutes
};

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Apply security headers to response
   */
  public applySecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    if (this.config.enableCSP) {
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.openai.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://api.openai.com https://*.supabase.co; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      );
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-Content-Type-Options
    if (this.config.enableContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (this.config.enableFrameOptions) {
      response.headers.set('X-Frame-Options', 'DENY');
    }

    // X-XSS-Protection
    if (this.config.enableXSSProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Additional security headers
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    return response;
  }

  /**
   * Validate request size
   */
  public validateRequestSize(request: NextRequest): boolean {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      return size <= this.config.maxRequestSize;
    }
    return true; // Allow if no content-length header
  }

  /**
   * Check rate limit for IP
   */
  public checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = `rate_limit_${ip}`;
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      });
      return {
        allowed: true,
        remaining: this.config.rateLimitMax - 1,
        resetTime: now + this.config.rateLimitWindow
      };
    }

    if (current.count >= this.config.rateLimitMax) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    // Increment count
    current.count++;
    rateLimitStore.set(key, current);

    return {
      allowed: true,
      remaining: this.config.rateLimitMax - current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * Sanitize user input
   */
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate API request
   */
  public validateApiRequest(request: NextRequest): { valid: boolean; error?: string } {
    // Check request size
    if (!this.validateRequestSize(request)) {
      return {
        valid: false,
        error: 'Request too large'
      };
    }

    // Check rate limit
    const ip = this.getClientIP(request);
    const rateLimit = this.checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return {
        valid: false,
        error: 'Rate limit exceeded'
      };
    }

    // Check content type for POST/PUT requests
    const method = request.method;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {
          valid: false,
          error: 'Invalid content type'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  /**
   * Create secure response
   */
  public createSecureResponse(data: unknown, status: number = 200): NextResponse {
    const response = NextResponse.json(data, { status });
    return this.applySecurityHeaders(response);
  }

  /**
   * Create error response
   */
  public createErrorResponse(error: string, status: number = 400): NextResponse {
    const response = NextResponse.json({ error }, { status });
    return this.applySecurityHeaders(response);
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Export convenience functions
export function applySecurityHeaders(response: NextResponse): NextResponse {
  return securityMiddleware.applySecurityHeaders(response);
}

export function validateApiRequest(request: NextRequest): { valid: boolean; error?: string } {
  return securityMiddleware.validateApiRequest(request);
}

export function createSecureResponse(data: unknown, status: number = 200): NextResponse {
  return securityMiddleware.createSecureResponse(data, status);
}

export function createErrorResponse(error: string, status: number = 400): NextResponse {
  return securityMiddleware.createErrorResponse(error, status);
}
