import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../lib/supabase';
import { generateAndUploadQRCode, regenerateQRCode } from '../../../../../lib/qrCodeUtils';
import type { Restaurant } from '../../../../../lib/supabase';

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

    // Check if QR code needs to be regenerated (slug or name change)
    let qrCodeUrl = currentRestaurant.qr_code_url;
    const shouldRegenerateQR = !qrCodeUrl || 
      (updatedData.name && updatedData.name !== currentRestaurant.name);

    if (shouldRegenerateQR) {
      try {
        // Get base URL from request headers or environment
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const baseUrl = `${protocol}://${host}`;

        // Generate or regenerate QR code
        qrCodeUrl = await generateAndUploadQRCode(
          restaurantSlug,
          baseUrl
        );
      } catch (qrError) {
        console.error('QR code generation failed:', qrError);
        // Don't fail the entire update if QR generation fails
        // Just log the error and continue
      }
    }

    // Update restaurant in Supabase
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({
        name: updatedData.name,
        description: updatedData.description,
        address: updatedData.address,
        schedule: updatedData.schedule,
        logo: updatedData.logo,
        cover: updatedData.cover,
        qr_code_url: qrCodeUrl,
        updated_at: new Date().toISOString()
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