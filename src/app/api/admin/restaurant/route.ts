import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { getCurrentUserAndRestaurant } from '../../../../../lib/currentRestaurant';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error) {
      if (error === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        { error: 'No restaurant found for current user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error fetching restaurant data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, error } = await getCurrentUserAndRestaurant();
    
    if (error) {
      if (error === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Create restaurant
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
      console.error('Supabase create error:', createError);
      return NextResponse.json(
        { error: 'Failed to create restaurant' },
        { status: 500 }
      );
    }

    // Create user_restaurants relationship
    const { error: relationshipError } = await supabaseAdmin
      .from('user_restaurants')
      .insert({
        user_id: user.id,
        restaurant_id: newRestaurant.id,
        role: 'owner'
      });

    if (relationshipError) {
      console.error('Failed to create user-restaurant relationship:', relationshipError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ 
      restaurant: newRestaurant,
      message: 'Restaurant created successfully'
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error) {
      if (error === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!restaurant) {
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

    // Update restaurant in Supabase
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
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update restaurant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      restaurant: data,
      message: 'Restaurant updated successfully'
    });
  } catch (error) {
    console.error('Error updating restaurant data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}