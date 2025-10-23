import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEnvironment } from '../../../../lib/env-validation';
// Google Business integration temporarily disabled
// import { syncGoogleBusinessRatings } from '../../../../lib/google-business-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Clean the slug
    const cleanSlug = (slug ?? '').toString().trim();
    
    // Validate environment variables
    let envConfig;
    try {
      envConfig = validateEnvironment();
    } catch (error) {
      console.error('Environment validation failed:', error);
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });
    
    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (restaurantError) {
      console.error('Database error:', restaurantError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: restaurantError.message,
        code: restaurantError.code 
      }, { status: 500 });
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Google Business rating sync temporarily disabled
    /*
    // Sync Google Business ratings if connected (in background, don't block response)
    if (restaurant.google_business_location_id) {
      syncGoogleBusinessRatings(restaurant.id).catch(error => {
        console.error('Background Google Business rating sync failed:', error);
      });
    }
    */

    // Get categories and products in parallel
    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('available', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('available', true)
        .order('sort_order', { ascending: true })
    ]);

    if (categoriesResult.error) {
      console.error('Categories error:', categoriesResult.error);
      return NextResponse.json({ 
        error: 'Failed to load categories', 
        details: categoriesResult.error.message,
        code: categoriesResult.error.code
      }, { status: 500 });
    }

    if (productsResult.error) {
      console.error('Products error:', productsResult.error);
      return NextResponse.json({ 
        error: 'Failed to load products', 
        details: productsResult.error.message,
        code: productsResult.error.code
      }, { status: 500 });
    }

    return NextResponse.json({
      restaurant,
      categories: categoriesResult.data || [],
      products: productsResult.data || []
    });

  } catch (error) {
    console.error('Error loading menu data:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}