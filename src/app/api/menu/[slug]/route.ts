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
    const { slug } = await params;

    // Direct Supabase queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get categories and products in parallel
    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id),
      supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurant.id)
    ]);

    const response: MenuResponse = {
      restaurant,
      categories: categoriesResult.data || [],
      products: productsResult.data || []
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