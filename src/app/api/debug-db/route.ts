import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET(): Promise<NextResponse> {
  try {
    // Check if sort_order column exists in products table
    const { data: productsColumns, error: productsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'products')
      .in('column_name', ['sort_order', 'available']);

    // Check if sort_order column exists in categories table
    const { data: categoriesColumns, error: categoriesError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'categories')
      .eq('column_name', 'sort_order');

    // Get sample products to see their current structure
    const { data: sampleProducts, error: sampleError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(3);

    // Get sample categories to see their current structure
    const { data: sampleCategories, error: sampleCategoriesError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .limit(3);

    return NextResponse.json({
      productsColumns: productsColumns || [],
      categoriesColumns: categoriesColumns || [],
      sampleProducts: sampleProducts || [],
      sampleCategories: sampleCategories || [],
      errors: {
        products: productsError,
        categories: categoriesError,
        sampleProducts: sampleError,
        sampleCategories: sampleCategoriesError
      }
    });
  } catch (error) {
    console.error('Error checking database schema:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
