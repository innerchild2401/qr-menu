import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { getCurrentUserRestaurant } from '../../../../../lib/admin-utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user's restaurant
    const restaurant = await getCurrentUserRestaurant();
    
    if (!restaurant) {
      return NextResponse.json(
        { error: 'No restaurant found for current user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error fetching restaurant data:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user's restaurant
    const restaurant = await getCurrentUserRestaurant();
    
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
    const { data, error } = await supabaseAdmin
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

    if (error) {
      console.error('Supabase update error:', error);
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
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}