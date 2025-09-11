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

    // First, try to find restaurant through user_restaurants table
    const { data: userRestaurant, error: userRestaurantError } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', userId)
      .single();

    let restaurantId = null;

    if (userRestaurant && userRestaurant.restaurant_id) {
      restaurantId = userRestaurant.restaurant_id;
    } else {
      // Fallback: try to find restaurant by owner_id
      const { data: ownerRestaurant, error: ownerError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (ownerRestaurant && ownerRestaurant.id) {
        restaurantId = ownerRestaurant.id;
      }
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'No restaurant found for user' }, { status: 404 });
    }

    // Get the restaurant details
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
