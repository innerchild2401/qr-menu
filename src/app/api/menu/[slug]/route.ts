import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Clean the slug
    const cleanSlug = (slug ?? '').toString().trim();
    
    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (restaurantError) {
      console.error('Database error:', restaurantError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Get categories and products in parallel
    const [categoriesResult, productsResult] = await Promise.all([
      supabaseAdmin
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at'),
      supabaseAdmin
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurant.id)
    ]);

    if (categoriesResult.error) {
      console.error('Categories error:', categoriesResult.error);
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
    }

    if (productsResult.error) {
      console.error('Products error:', productsResult.error);
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
    }

    return NextResponse.json({
      restaurant,
      categories: categoriesResult.data || [],
      products: productsResult.data || []
    });

  } catch (error) {
    console.error('Error loading menu data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}