import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'eu@eu.com';
    
    console.log(`🔍 Debugging restaurant access for user: ${email}`);
    
    // Get user from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({
        error: 'User not found in auth.users',
        email,
        debug: {
          authUsers: authUser.users.map(u => ({ id: u.id, email: u.email })),
          searchedEmail: email
        }
      }, { status: 404 });
    }
    
    console.log(`✅ Found user in auth.users: ${user.id}`);
    
    // Check if user exists in users table
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.log('⚠️ User not found in users table:', userError.message);
    } else {
      console.log('✅ User found in users table:', userRecord);
    }
    
    // Check user_restaurants table
    const { data: userRestaurants, error: urError } = await supabaseAdmin
      .from('user_restaurants')
      .select(`
        *,
        restaurants (*)
      `)
      .eq('user_id', user.id);
    
    if (urError) {
      console.log('⚠️ Error querying user_restaurants:', urError.message);
    } else {
      console.log('📋 User restaurants:', userRestaurants);
    }
    
    // Check restaurants with owner_id
    const { data: ownedRestaurants, error: ownerError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id);
    
    if (ownerError) {
      console.log('⚠️ Error querying restaurants by owner_id:', ownerError.message);
    } else {
      console.log('📋 Owned restaurants:', ownedRestaurants);
    }
    
    // Try the enhanced function
    const { data: enhancedRestaurants, error: enhancedError } = await supabaseAdmin
      .rpc('get_user_restaurants_enhanced', { user_uuid: user.id });
    
    if (enhancedError) {
      console.log('⚠️ Enhanced function error:', enhancedError.message);
    } else {
      console.log('📋 Enhanced function results:', enhancedRestaurants);
    }
    
    // Check all restaurants to see if any should be linked
    const { data: allRestaurants, error: allRestaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .limit(10);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      userRecord,
      userRestaurants: userRestaurants || [],
      ownedRestaurants: ownedRestaurants || [],
      enhancedRestaurants: enhancedRestaurants || [],
      allRestaurants: allRestaurants || [],
      errors: {
        userError: userError?.message,
        urError: urError?.message,
        ownerError: ownerError?.message,
        enhancedError: enhancedError?.message,
        allRestaurantsError: allRestaurantsError?.message
      },
      recommendations: [
        userError ? 'User needs to be created in users table' : null,
        (!userRestaurants || userRestaurants.length === 0) && (!ownedRestaurants || ownedRestaurants.length === 0) 
          ? 'User has no restaurant relationships' : null,
        allRestaurants && allRestaurants.length > 0 
          ? `Found ${allRestaurants.length} restaurants in database` : null
      ].filter(Boolean)
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, restaurantSlug } = await request.json();
    
    if (!email || !restaurantSlug) {
      return NextResponse.json({
        error: 'Email and restaurantSlug are required'
      }, { status: 400 });
    }
    
    console.log(`🔗 Linking user ${email} to restaurant ${restaurantSlug}`);
    
    // Call the linking function
    const { data: result, error } = await supabaseAdmin
      .rpc('link_user_to_existing_restaurant', { 
        user_email: email, 
        restaurant_slug: restaurantSlug 
      });
    
    if (error) {
      console.error('❌ Linking error:', error);
      return NextResponse.json({
        error: 'Failed to link user to restaurant',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully linked user ${email} to restaurant ${restaurantSlug}`,
      result
    });
    
  } catch (error) {
    console.error('❌ Link endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
