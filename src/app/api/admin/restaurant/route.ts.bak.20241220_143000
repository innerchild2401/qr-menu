import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../lib/supabase-server';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Get restaurant data from Supabase
    const restaurant = await getRestaurantBySlug(restaurantSlug);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
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

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Parse request body
    const updatedData = await request.json();

    // Get current restaurant data
    const currentRestaurant = await getRestaurantBySlug(restaurantSlug);
    
    if (!currentRestaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!updatedData.name || !updatedData.address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    // Note: qr_code_url column doesn't exist in actual schema
    // QR code generation is handled separately in /api/admin/qr/[action]

    // Update restaurant in Supabase
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({
        name: updatedData.name,
        address: updatedData.address,
        schedule: updatedData.schedule,
        logo_url: updatedData.logo_url, // Frontend should send logo_url
        cover_url: updatedData.cover_url // Frontend should send cover_url
        // Note: description, qr_code_url, updated_at columns don't exist in actual schema
      })
      .eq('id', currentRestaurant.id)
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
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}