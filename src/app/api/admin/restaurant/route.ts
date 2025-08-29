import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { getUserFromHeaders, getUserRestaurant } from '../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 GET /api/admin/restaurant - Starting request');
    
    const userId = getUserFromHeaders(request);
    
    if (!userId) {
      console.log('❌ Unauthorized: Missing user ID in headers');
      return NextResponse.json(
        { error: 'Unauthorized - Missing user ID' },
        { status: 401 }
      );
    }

    // Get user's restaurant using service role
    const restaurant = await getUserRestaurant(userId);
    
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
    
    const userId = getUserFromHeaders(request);
    
    if (!userId) {
      console.log('❌ Unauthorized: Missing user ID in headers');
      return NextResponse.json(
        { error: 'Unauthorized - Missing user ID' },
        { status: 401 }
      );
    }

    console.log('✅ Authenticated user for restaurant creation:', userId);

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

    console.log('🔍 Creating restaurant with data:', { name, slug, owner_id: userId });

    // Create restaurant using service role
    const { data: newRestaurant, error: createError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        name: name.trim(),
        slug,
        address: address.trim(),
        schedule: schedule || {},
        owner_id: userId,
        currency: 'RON',
        nutrition_language: 'EN'
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
        user_id: userId,
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
    
    const userId = getUserFromHeaders(request);
    
    if (!userId) {
      console.log('❌ Unauthorized: Missing user ID in headers');
      return NextResponse.json(
        { error: 'Unauthorized - Missing user ID' },
        { status: 401 }
      );
    }

    // Get user's restaurant using service role
    const restaurant = await getUserRestaurant(userId);
    
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
        cover_url: updatedData.cover_url,
        currency: updatedData.currency,
        nutrition_language: updatedData.nutrition_language
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