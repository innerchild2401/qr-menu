import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from './supabase-server';

/**
 * Extract user ID from request headers
 */
export function getUserFromHeaders(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId;
}

/**
 * Get user ID from session cookies (fallback when header is missing)
 */
async function getUserFromCookies(request: NextRequest): Promise<string | null> {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
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

    // Try getSession first (more reliable for cookies)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('🔍 getSession result:', { hasSession: !!session, hasUser: !!session?.user, error: sessionError });
    if (!sessionError && session?.user?.id) {
      console.log('✅ Got user ID from getSession:', session.user.id);
      return session.user.id;
    }

    // Fallback to getUser if getSession doesn't work
    console.log('🔍 Trying getUser as fallback...');
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔍 getUser result:', { hasUser: !!user, error });
    if (error || !user) {
      console.log('❌ getUser also failed');
      return null;
    }
    console.log('✅ Got user ID from getUser:', user.id);
    return user.id;
  } catch (error) {
    console.error('Error getting user from cookies:', error);
    return null;
  }
}

/**
 * Get user's restaurant using service role
 */
export async function getUserRestaurant(userId: string) {
  try {
    
    // First, try to find restaurant via user_restaurants table
    const { data: userRestaurant, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        role,
        restaurant_id
      `)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (!urError && userRestaurant && userRestaurant.restaurant_id) {
      // Get the restaurant details using the restaurant_id
      const { data: restaurant, error: rError } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', userRestaurant.restaurant_id)
        .single();

      if (!rError && restaurant) {
        return restaurant;
      }
    }

    // Fallback: try to find restaurant via owner_id
    const { data: restaurant, error: rError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', userId)
      .single();

    if (!rError && restaurant) {
      return restaurant;
    }

    return null;
  } catch (error) {
    console.error('Error getting user restaurant:', error);
    return null;
  }
}

/**
 * Validate user authentication and get their restaurant
 */
export async function validateUserAndGetRestaurant(request: NextRequest) {
  // Try to get user ID from headers first (set by middleware)
  let userId = getUserFromHeaders(request);
  
  // Fallback: try to get user ID from cookies if header is missing
  if (!userId) {
    console.log('🔍 No x-user-id header found, trying cookie fallback...');
    userId = await getUserFromCookies(request);
    if (userId) {
      console.log('✅ Got user ID from cookies:', userId);
    } else {
      console.log('❌ Could not get user ID from cookies either');
    }
  } else {
    console.log('✅ Got user ID from headers:', userId);
  }
  
  if (!userId) {
    return { user: null, restaurant: null, error: 'Missing user ID in headers' };
  }

  const restaurant = await getUserRestaurant(userId);
  
  if (!restaurant) {
    return { user: { id: userId }, restaurant: null, error: 'No restaurant found for user' };
  }

  return { user: { id: userId }, restaurant, error: null };
}
