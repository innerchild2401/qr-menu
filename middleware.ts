import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, validateApiRequest } from './src/lib/security-middleware';
import { validateCSRFRequest } from './src/lib/csrf-protection';

export async function middleware(req: NextRequest) {
  // Validate API requests
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const validation = validateApiRequest(req);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Additional CSRF validation for state-changing operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const csrfValidation = validateCSRFRequest(req);
      if (!csrfValidation.valid) {
        return NextResponse.json(
          { error: csrfValidation.error },
          { status: 403 }
        );
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Check if user is authenticated for admin routes (both /admin and /api/admin)
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api/admin');
  
  if (isAdminRoute) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If we have a session, set the user ID header
      if (session?.user?.id) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', session.user.id);
        
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } else if (!req.nextUrl.pathname.startsWith('/api/')) {
        // Only redirect page routes if no session (let API routes handle auth themselves)
        return NextResponse.redirect(new URL('/', req.url));
      }
      // For API routes without session, let the route handler decide (it has cookie fallback)
    } catch (error) {
      // If session check fails, let the route handler decide for API routes
      if (!req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
  }

  // Apply security headers to all responses
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*']
};
