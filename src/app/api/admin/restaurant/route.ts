import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper function to get current user from session
async function getCurrentUserFromSession() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('❌ No authenticated user found in session:', error?.message);
      return null;
    }

    console.log('✅ Authenticated user found:', user.email);
    return user;
  } catch (error) {
    console.error('❌ Error getting user from session:', error);
    return null;
  }
}

// Helper function to get user's restaurant using service role
async function getUserRestaurant(userId: string) {
  try {
    console.log(`🔍 Getting restaurant for user: ${userId}`);
    
    // First, try to find restaurant through user_restaurants table
    const { data: userRestaurant, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        restaurant_id,
        restaurants (*)
      `)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!urError && userRestaurant && userRestaurant.restaurants && Array.isArray(userRestaurant.restaurants) && userRestaurant.restaurants.length > 0) {
      const restaurant = userRestaurant.restaurants[0];
      console.log('✅ Found restaurant via user_restaurants:', restaurant.name);
      return restaurant;
    }

    // Fallback: try to find restaurant by owner_id
    const { data: ownedRestaurant, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!ownerError && ownedRestaurant) {
      console.log('✅ Found restaurant via owner_id:', ownedRestaurant.name);
      return ownedRestaurant;
    }

    console.log('❌ No restaurant found for user');
    return null;
  } catch (error) {
    console.error('❌ Error getting user restaurant:', error);
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 GET /api/admin/restaurant - Starting request');
    
    // Get current user from session
    const user = await getCurrentUserFromSession();
    
    if (!user) {
      console.log('❌ Unauthorized: No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's restaurant using service role
    const restaurant = await getUserRestaurant(user.id);
    
    if (!restaurant) {
      console.log('❌ No restaurant found for user');
      return NextResponse.json(
        { error: 'No restaurant found for current user' },
        { status: 404 }
      );
    }

    console.log('✅ Successfully retrieved restaurant:', restaurant.name);
    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('❌ Error in GET /api/admin/restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 POST /api/admin/restaurant - Starting request');
    
    // Get current user from session
    const user = await getCurrentUserFromSession();
    
    if (!user) {
      console.log('❌ Unauthorized: No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ Authenticated user for restaurant creation:', user.email);

    // Parse request body
    const { name, address, schedule } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'Restaurant address is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    console.log('🔍 Creating restaurant with data:', { name, slug, owner_id: user.id });

    // Create restaurant using service role
    const { data: newRestaurant, error: createError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        name: name.trim(),
        slug,
        address: address.trim(),
        schedule: schedule || {},
        owner_id: user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Restaurant creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create restaurant' },
        { status: 500 }
      );
    }

    console.log('✅ Restaurant created successfully:', newRestaurant.name);

    // Create user_restaurants relationship
    const { error: relationshipError } = await supabaseAdmin
      .from('user_restaurants')
      .insert({
        user_id: user.id,
        restaurant_id: newRestaurant.id,
        role: 'owner'
      });

    if (relationshipError) {
      console.error('⚠️ Failed to create user-restaurant relationship:', relationshipError);
      // Don't fail the request, but log the error
    } else {
      console.log('✅ User-restaurant relationship created');
    }

    return NextResponse.json({ 
      restaurant: newRestaurant,
      message: 'Restaurant created successfully'
    });
  } catch (error) {
    console.error('❌ Error in POST /api/admin/restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 PUT /api/admin/restaurant - Starting request');
    
    // Get current user from session
    const user = await getCurrentUserFromSession();
    
    if (!user) {
      console.log('❌ Unauthorized: No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's restaurant using service role
    const restaurant = await getUserRestaurant(user.id);
    
    if (!restaurant) {
      console.log('❌ No restaurant found for user');
      return NextResponse.json(
        { error: 'No restaurant found for current user' },
        { status: 404 }
      );
    }

    // Parse request body
    const updatedData = await request.json();

    // Validate required fields
    if (!updatedData.name || !updatedData.address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Updating restaurant:', restaurant.name);

    // Update restaurant using service role
    const { data, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        name: updatedData.name,
        address: updatedData.address,
        schedule: updatedData.schedule,
        logo_url: updatedData.logo_url,
        cover_url: updatedData.cover_url
      })
      .eq('id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Restaurant update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update restaurant' },
        { status: 500 }
      );
    }

    console.log('✅ Restaurant updated successfully');
    return NextResponse.json({ 
      restaurant: data,
      message: 'Restaurant updated successfully'
    });
  } catch (error) {
    console.error('❌ Error in PUT /api/admin/restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}