/**
 * CSRF Protection
 * Implements Cross-Site Request Forgery protection
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

interface CSRFToken {
  token: string;
  expires: number;
}

class CSRFProtection {
  private static instance: CSRFProtection;
  private tokenStore = new Map<string, CSRFToken>();
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Generate a new CSRF token
   */
  public generateToken(sessionId: string): string {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const expires = Date.now() + this.TOKEN_EXPIRY;
    
    this.tokenStore.set(sessionId, { token, expires });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  /**
   * Validate a CSRF token
   */
  public validateToken(sessionId: string, token: string): boolean {
    const storedToken = this.tokenStore.get(sessionId);
    
    if (!storedToken) {
      return false;
    }
    
    if (Date.now() > storedToken.expires) {
      this.tokenStore.delete(sessionId);
      return false;
    }
    
    return storedToken.token === token;
  }

  /**
   * Get CSRF token from request
   */
  public getTokenFromRequest(request: NextRequest): string | null {
    // Check header first
    const headerToken = request.headers.get('x-csrf-token');
    if (headerToken) {
      return headerToken;
    }
    
    // Check form data
    const formData = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded');
    if (formData) {
      // This would need to be handled in the route handler
      return null;
    }
    
    return null;
  }

  /**
   * Get session ID from request
   */
  public getSessionId(request: NextRequest): string {
    // Try to get from session cookie
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      return sessionCookie;
    }
    
    // Fallback to IP + User-Agent hash
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    return crypto.createHash('sha256').update(ip + userAgent).digest('hex').substring(0, 16);
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, token] of this.tokenStore.entries()) {
      if (now > token.expires) {
        this.tokenStore.delete(sessionId);
      }
    }
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
   * Revoke token (for logout)
   */
  public revokeToken(sessionId: string): void {
    this.tokenStore.delete(sessionId);
  }

  /**
   * Get token info for debugging
   */
  public getTokenInfo(sessionId: string): { exists: boolean; expires: number | null } {
    const token = this.tokenStore.get(sessionId);
    return {
      exists: !!token,
      expires: token?.expires || null
    };
  }
}

// Export singleton instance
export const csrfProtection = CSRFProtection.getInstance();

// Export convenience functions
export function generateCSRFToken(sessionId: string): string {
  return csrfProtection.generateToken(sessionId);
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  return csrfProtection.validateToken(sessionId, token);
}

export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  return csrfProtection.getTokenFromRequest(request);
}

export function getSessionIdFromRequest(request: NextRequest): string {
  return csrfProtection.getSessionId(request);
}

export function revokeCSRFToken(sessionId: string): void {
  csrfProtection.revokeToken(sessionId);
}

/**
 * CSRF middleware for API routes
 */
export function validateCSRFRequest(request: NextRequest): { valid: boolean; error?: string } {
  // Skip CSRF validation for GET requests
  if (request.method === 'GET') {
    return { valid: true };
  }
  
  // Skip CSRF validation for public endpoints
  const publicEndpoints = [
    '/api/menu/',
    '/api/popups/',
    '/api/test-',
    '/api/debug-'
  ];
  
  const pathname = request.nextUrl.pathname;
  if (publicEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
    return { valid: true };
  }
  
  try {
    const sessionId = getSessionIdFromRequest(request);
    const token = getCSRFTokenFromRequest(request);
    
    if (!token) {
      return {
        valid: false,
        error: 'CSRF token missing'
      };
    }
    
    if (!validateCSRFToken(sessionId, token)) {
      return {
        valid: false,
        error: 'Invalid CSRF token'
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'CSRF validation failed'
    };
  }
}
