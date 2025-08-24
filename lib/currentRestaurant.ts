import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase-server';

// Restaurant type for admin operations
export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  address?: string;
  schedule?: Record<string, string>;
  logo_url?: string;
  cover_url?: string;
  owner_id?: string;
  created_at: string;
}

// User type for admin operations
export interface AdminUser {
  id: string;
  email?: string;
}

// Server-side Supabase client with auth context
const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  // Debug environment variables
  console.log('🔧 Environment variables check:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables for Supabase');
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
};

// Cache for current request (per-request cache)
const restaurantCache = new Map<string, AdminRestaurant | null>();

/**
 * Get the current restaurant for the authenticated user
 * Priority: user_restaurants table (most recent) -> restaurants.owner_id (most recent)
 */
export async function getCurrentRestaurantForUser(userId: string): Promise<{ restaurant: AdminRestaurant | null; error: string | null }> {
  // Check cache first
  if (restaurantCache.has(userId)) {
    return { restaurant: restaurantCache.get(userId) || null, error: null };
  }

  try {
    console.log(`🔍 Fetching restaurant for user: ${userId}`);
    
    // First, try to find restaurant through user_restaurants table (most recent)
    console.log('📋 Trying user_restaurants table...');
    const { data: userRestaurant, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        restaurant_id,
        restaurants (
          id,
          name,
          slug,
          address,
          schedule,
          logo_url,
          cover_url,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (urError) {
      console.log('⚠️ user_restaurants query error:', urError.message);
    } else if (userRestaurant && userRestaurant.restaurants && Array.isArray(userRestaurant.restaurants) && userRestaurant.restaurants.length > 0) {
      const restaurant = userRestaurant.restaurants[0] as AdminRestaurant;
      console.log('✅ Found restaurant via user_restaurants:', restaurant.name);
      restaurantCache.set(userId, restaurant);
      return { restaurant, error: null };
    } else {
      console.log('ℹ️ No restaurant found in user_restaurants table');
    }

    // Fallback: try to find restaurant by owner_id (most recent)
    console.log('📋 Trying restaurants.owner_id fallback...');
    const { data: ownerRestaurant, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ownerError) {
      console.log('⚠️ restaurants.owner_id query error:', ownerError.message);
    } else if (ownerRestaurant) {
      const restaurant = ownerRestaurant as AdminRestaurant;
      console.log('✅ Found restaurant via owner_id:', restaurant.name);
      restaurantCache.set(userId, restaurant);
      return { restaurant, error: null };
    } else {
      console.log('ℹ️ No restaurant found via owner_id');
    }

    // Try the enhanced function as a last resort
    console.log('📋 Trying enhanced function...');
    const { data: enhancedRestaurants, error: enhancedError } = await supabaseAdmin
      .rpc('get_user_restaurants_enhanced', { user_uuid: userId });

    if (enhancedError) {
      console.log('⚠️ Enhanced function error:', enhancedError.message);
    } else if (enhancedRestaurants && enhancedRestaurants.length > 0) {
      const restaurantData = enhancedRestaurants[0];
      console.log('✅ Found restaurant via enhanced function:', restaurantData.restaurant_name);
      
      // Get full restaurant data
      const { data: fullRestaurant, error: fullError } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', restaurantData.restaurant_id)
        .single();
      
      if (!fullError && fullRestaurant) {
        const restaurant = fullRestaurant as AdminRestaurant;
        restaurantCache.set(userId, restaurant);
        return { restaurant, error: null };
      }
    }

    // No restaurant found
    console.log('❌ No restaurant found for user');
    restaurantCache.set(userId, null);
    return { restaurant: null, error: null };

  } catch (error) {
    console.error('❌ Error fetching current restaurant:', error);
    return { restaurant: null, error: 'Failed to fetch restaurant data' };
  }
}

/**
 * Get current user and their restaurant in one call
 */
export async function getCurrentUserAndRestaurant(): Promise<{ user: AdminUser | null; restaurant: AdminRestaurant | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { user: null, restaurant: null, error: 'Unauthorized' };
    }

    // Get restaurant for user
    const { restaurant, error: restaurantError } = await getCurrentRestaurantForUser(user.id);
    
    if (restaurantError) {
      return { user: { id: user.id, email: user.email }, restaurant: null, error: restaurantError };
    }

    return { user: { id: user.id, email: user.email }, restaurant, error: null };

  } catch (error) {
    console.error('Error in getCurrentUserAndRestaurant:', error);
    return { user: null, restaurant: null, error: 'Internal server error' };
  }
}

/**
 * Verify user owns the specified restaurant
 */
export async function verifyRestaurantOwnership(userId: string, restaurantId: string): Promise<boolean> {
  try {
    // Check user_restaurants table first
    const { data: userRestaurant, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('role', 'owner')
      .single();

    if (!urError && userRestaurant) {
      return true;
    }

    // Fallback: check owner_id
    const { data: restaurant, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', userId)
      .single();

    return !ownerError && !!restaurant;

  } catch (error) {
    console.error('Error verifying restaurant ownership:', error);
    return false;
  }
}

// Clear cache (useful for testing or when data changes)
export function clearRestaurantCache() {
  restaurantCache.clear();
}
