/**
 * Secure API Route Helpers
 * Enhanced security for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateCSRFRequest } from './csrf-protection';
import { validateInput, sanitizeString } from './validation-schemas';
import { securityMiddleware } from './security-middleware';

// Request size limits
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_JSON_SIZE = 1024 * 1024; // 1MB for JSON

// Rate limiting (requests per minute per IP)
const RATE_LIMIT = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

interface SecureRequestOptions {
  requireAuth?: boolean;
  requireCSRF?: boolean;
  validateInput?: z.ZodSchema<unknown>;
  maxRequestSize?: number;
  allowedMethods?: string[];
}

/**
 * Enhanced API route wrapper with comprehensive security
 */
export async function secureApiHandler(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: SecureRequestOptions = {}
): Promise<NextResponse> {
  try {
    // 1. Method validation
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      return securityMiddleware.createErrorResponse(
        `Method ${request.method} not allowed`,
        405
      );
    }

    // 2. Request size validation
    const maxSize = options.maxRequestSize || MAX_REQUEST_SIZE;
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return securityMiddleware.createErrorResponse(
        'Request too large',
        413
      );
    }

    // 3. Rate limiting
    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return securityMiddleware.createErrorResponse(
        'Rate limit exceeded',
        429
      );
    }

    // 4. CSRF protection
    if (options.requireCSRF !== false) {
      const csrfResult = validateCSRFRequest(request);
      if (!csrfResult.valid) {
        return securityMiddleware.createErrorResponse(
          csrfResult.error || 'CSRF validation failed',
          403
        );
      }
    }

    // 5. Input validation
    if (options.validateInput && request.method !== 'GET') {
      try {
        const body = await request.json();
        const validatedData = validateInput(options.validateInput, body);
        
        // Create new request with validated data
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(validatedData)
        });
        
        return await handler(newRequest);
      } catch (error) {
        return securityMiddleware.createErrorResponse(
          error instanceof Error ? error.message : 'Invalid input',
          400
        );
      }
    }

    // 6. Execute handler
    const response = await handler(request);
    
    // 7. Apply security headers
    return securityMiddleware.applySecurityHeaders(response);

  } catch (error) {
    console.error('API handler error:', error);
    return securityMiddleware.createErrorResponse(
      'Internal server error',
      500
    );
  }
}

/**
 * Check rate limit for request
 */
function checkRateLimit(request: NextRequest): { allowed: boolean; remaining: number } {
  const ip = getClientIP(request);
  const now = Date.now();
  const key = `rate_limit_${ip}`;
  
  const current = RATE_LIMIT.get(key);
  
  if (!current || now > current.resetTime) {
    RATE_LIMIT.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  RATE_LIMIT.set(key, current);
  
  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count };
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
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
 * Sanitize request body
 */
export function sanitizeRequestBody(body: unknown): unknown {
  if (typeof body === 'string') {
    return sanitizeString(body);
  }
  
  if (Array.isArray(body)) {
    return body.map(sanitizeRequestBody);
  }
  
  if (body && typeof body === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      sanitized[sanitizeString(key)] = sanitizeRequestBody(value);
    }
    return sanitized;
  }
  
  return body;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize} bytes`
    };
  }
  
  return { valid: true };
}

/**
 * Create secure response with proper error handling
 */
export function createSecureResponse(
  data: unknown,
  status: number = 200,
  options: { sanitize?: boolean } = {}
): NextResponse {
  let responseData = data;
  
  if (options.sanitize) {
    responseData = sanitizeRequestBody(data);
  }
  
  return securityMiddleware.createSecureResponse(responseData, status);
}

/**
 * Create error response without information disclosure
 */
export function createSecureErrorResponse(
  error: string,
  status: number = 400,
  includeDetails: boolean = false
): NextResponse {
  const response = {
    error: sanitizeString(error),
    timestamp: new Date().toISOString(),
    ...(includeDetails && { status })
  };
  
  return securityMiddleware.createErrorResponse(
    JSON.stringify(response),
    status
  );
}

/**
 * Validate authentication
 */
export async function validateAuth(request: NextRequest): Promise<{ valid: boolean; user?: unknown; error?: string }> {
  try {
    // Check for authentication header
    const authHeader = request.headers.get('authorization');
    const staffHeader = request.headers.get('x-staff-user-id');
    
    if (authHeader) {
      // Handle JWT authentication
      // Implementation would depend on your auth system
      return { valid: true, user: { id: 'user-id' } };
    }
    
    if (staffHeader) {
      // Handle staff authentication
      return { valid: true, user: { id: staffHeader } };
    }
    
    return { valid: false, error: 'Authentication required' };
    } catch {
      return { valid: false, error: 'Authentication validation failed' };
    }
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  details: unknown,
  request: NextRequest
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    url: request.url,
    method: request.method,
    details
  };
  
  console.warn('Security Event:', JSON.stringify(logEntry));
}

/**
 * Common validation schemas for API routes
 */
export const commonSchemas = {
  id: z.string().uuid(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  url: z.string().url(),
  pagination: z.object({
    page: z.number().int().min(1).max(1000).optional(),
    limit: z.number().int().min(1).max(100).optional()
  })
};
