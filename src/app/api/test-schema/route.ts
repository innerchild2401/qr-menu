import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';

export async function GET(): Promise<NextResponse> {
  try {
    // Try to get products with sort_order to see if the column exists
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, sort_order, available')
      .limit(2);

    // Try to get categories with sort_order to see if the column exists
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('id, name, sort_order')
      .limit(2);

    return NextResponse.json({
      products: products || [],
      categories: categories || [],
      productsError: productsError?.message || null,
      categoriesError: categoriesError?.message || null,
      hasSortOrderColumns: !productsError && !categoriesError
    });
  } catch (error) {
    console.error('Error testing schema:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
