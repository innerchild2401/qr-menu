import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    console.log('API route called with params:', await params);
    
    const { slug } = await params;
    
    // Clean the slug
    const cleanSlug = (slug ?? '').toString().trim();
    console.log('Clean slug:', cleanSlug);
    
    // Check if supabaseAdmin is properly configured
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    console.log('Restaurant query result:', { restaurant: !!restaurant, error: restaurantError });

    if (restaurantError) {
      console.error('Database error:', restaurantError);
      return NextResponse.json({ error: 'Database error', details: restaurantError.message }, { status: 500 });
    }

    if (!restaurant) {
      console.log('Restaurant not found for slug:', cleanSlug);
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    console.log('Found restaurant:', restaurant.id);

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

    console.log('Categories result:', { data: categoriesResult.data?.length, error: categoriesResult.error });
    console.log('Products result:', { data: productsResult.data?.length, error: productsResult.error });

    if (categoriesResult.error) {
      console.error('Categories error:', categoriesResult.error);
      return NextResponse.json({ error: 'Failed to load categories', details: categoriesResult.error.message }, { status: 500 });
    }

    if (productsResult.error) {
      console.error('Products error:', productsResult.error);
      return NextResponse.json({ error: 'Failed to load products', details: productsResult.error.message }, { status: 500 });
    }

    const response = {
      restaurant,
      categories: categoriesResult.data || [],
      products: productsResult.data || []
    };

    console.log('Returning response with:', {
      restaurant: response.restaurant.name,
      categoriesCount: response.categories.length,
      productsCount: response.products.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error loading menu data:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}