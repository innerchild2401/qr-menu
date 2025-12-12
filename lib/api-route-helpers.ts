import { NextRequest } from 'next/server';
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for read operations
          },
          remove() {
            // Not needed for read operations
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
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
    userId = await getUserFromCookies(request);
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
