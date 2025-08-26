import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    console.log('Menu API called');
    
    const { slug } = await params;
    console.log('Slug received:', slug);
    
    // Clean the slug
    const cleanSlug = (slug ?? '').toString().trim();
    console.log('Clean slug:', cleanSlug);
    
    // Create Supabase client directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service role key exists:', !!supabaseServiceRoleKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });
    
    console.log('Supabase client created');
    
    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    console.log('Restaurant query result:', { restaurant: !!restaurant, error: restaurantError });

    if (restaurantError) {
      console.error('Database error:', restaurantError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: restaurantError.message,
        code: restaurantError.code 
      }, { status: 500 });
    }

    if (!restaurant) {
      console.log('Restaurant not found for slug:', cleanSlug);
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    console.log('Found restaurant:', restaurant.id);

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

    console.log('Categories result:', { data: categoriesResult.data?.length, error: categoriesResult.error });
    console.log('Products result:', { data: productsResult.data?.length, error: productsResult.error });

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