import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

export async function GET(request: NextRequest) {
  try {
    // Get the user ID from headers (sent by authenticatedApiCall)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 401 });
    }

    // Get the user's restaurant
    const { data: userRestaurant, error: userRestaurantError } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', userId)
      .single();

    if (userRestaurantError || !userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found for user' }, { status: 404 });
    }

    // Get the restaurant details
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', userRestaurant.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
