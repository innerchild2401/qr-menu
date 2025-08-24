import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Restaurant type for admin operations
export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo_url?: string;
  cover_url?: string;
  owner_id?: string;
  created_at: string;
}

// Server-side Supabase client with auth context
export const createServerSupabaseClient = () => {
  const cookieStore = cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  );
};

// Helper function to get current user's restaurant
export const getCurrentUserRestaurant = async (): Promise<AdminRestaurant | null> => {
  const supabase = createServerSupabaseClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Get user's restaurant through user_restaurants table
  const { data: userRestaurant, error: urError } = await supabase
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
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (urError) {
    console.error('Error fetching user restaurant:', urError);
    throw new Error('Failed to fetch restaurant data');
  }

  if (!userRestaurant) {
    return null; // User has no restaurant
  }

  return userRestaurant.restaurants[0] as AdminRestaurant;
};

// Helper function to verify user owns restaurant
export const verifyRestaurantOwnership = async (restaurantId: string) => {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: userRestaurant, error: urError } = await supabase
    .from('user_restaurants')
    .select('restaurant_id')
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurantId)
    .eq('role', 'owner')
    .single();

  if (urError || !userRestaurant) {
    throw new Error('Unauthorized - Restaurant access denied');
  }

  return true;
};
