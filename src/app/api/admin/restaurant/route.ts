import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { readJson, writeJson } from '../../../../../lib/fsStore';

// Define types for restaurant data
interface Restaurant {
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo: string;
  cover: string;
}

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

    // Read restaurant data
    const restaurant = await readJson<Restaurant>(`data/restaurants/${restaurantSlug}.json`);

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error fetching restaurant data:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
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

    // Read current restaurant data
    const currentRestaurant = await readJson<Restaurant>(`data/restaurants/${restaurantSlug}.json`);

    // Merge updated data with current data (preserve slug and other fields)
    const updatedRestaurant: Restaurant = {
      ...currentRestaurant,
      ...updatedData,
      slug: restaurantSlug, // Ensure slug cannot be changed
    };

    // Validate required fields
    if (!updatedRestaurant.name || !updatedRestaurant.address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    // Write updated data back to file
    await writeJson(`data/restaurants/${restaurantSlug}.json`, updatedRestaurant);

    return NextResponse.json({ 
      restaurant: updatedRestaurant,
      message: 'Restaurant updated successfully'
    });
  } catch (error) {
    console.error('Error updating restaurant data:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
