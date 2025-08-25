import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase-server';

/**
 * Extract user ID from request headers
 */
export function getUserFromHeaders(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId;
}

/**
 * Get user's restaurant using service role
 */
export async function getUserRestaurant(userId: string) {
  try {
    console.log('🔍 Looking up restaurant for user:', userId);
    
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
        console.log('✅ Found restaurant via user_restaurants:', restaurant.name);
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
      console.log('✅ Found restaurant via owner_id:', restaurant.name);
      return restaurant;
    }

    console.log('❌ No restaurant found for user:', userId);
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
  const userId = getUserFromHeaders(request);
  
  if (!userId) {
    return { user: null, restaurant: null, error: 'Missing user ID in headers' };
  }

  const restaurant = await getUserRestaurant(userId);
  
  if (!restaurant) {
    return { user: { id: userId }, restaurant: null, error: 'No restaurant found for user' };
  }

  return { user: { id: userId }, restaurant, error: null };
}
