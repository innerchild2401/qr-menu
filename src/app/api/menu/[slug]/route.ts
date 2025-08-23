import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantWithData } from '../../../../../lib/supabase-server';
import { initializeServer } from '../../../../../lib/serverInit';
import type { Restaurant, Category, Product } from '../../../../../lib/supabase-server';

interface MenuResponse {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<MenuResponse | { error: string }>> {
  try {
    // Initialize server resources
    await initializeServer();
    
    const { slug } = await params;

    // Fetch restaurant data with categories and products from Supabase
    const data = await getRestaurantWithData(slug);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const response: MenuResponse = {
      restaurant: data.restaurant,
      categories: data.categories,
      products: data.products
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching menu data:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}