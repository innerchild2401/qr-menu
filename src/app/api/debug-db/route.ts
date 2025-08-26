import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create Supabase client directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1);

    if (testError) {
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: testError.message,
        code: testError.code
      }, { status: 500 });
    }

    // Get all restaurants
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*');

    if (restaurantsError) {
      return NextResponse.json({ 
        error: 'Failed to get restaurants', 
        details: restaurantsError.message 
      }, { status: 500 });
    }

    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);

    if (categoriesError) {
      return NextResponse.json({ 
        error: 'Failed to get categories', 
        details: categoriesError.message 
      }, { status: 500 });
    }

    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(5);

    if (productsError) {
      return NextResponse.json({ 
        error: 'Failed to get products', 
        details: productsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      restaurants: restaurants || [],
      categories: categories || [],
      products: products || [],
      testData: testData || []
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
