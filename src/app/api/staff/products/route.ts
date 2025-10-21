import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get staff user from request headers (set by middleware)
    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff user's accessible categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .rpc('get_user_categories', { user_id: staffUserId });

    console.log('Staff user categories:', { staffUserId, categories, categoriesError });

    if (categoriesError) {
      console.error('Error fetching user categories:', categoriesError);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    if (!categories || categories.length === 0) {
      console.log('No categories found for staff user:', staffUserId);
      return NextResponse.json([]);
    }

    const categoryIds = categories.map((c: { category_id: number }) => c.category_id);

    // Get products from accessible categories
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        price,
        category_id,
        has_recipe,
        recipe,
        last_modified_at,
        categories(name)
      `)
      .in('category_id', categoryIds)
      .eq('available', true)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Transform the data
    const transformedProducts = products?.map(product => ({
      ...product,
      category_name: product.categories?.[0]?.name
    })) || [];

    return NextResponse.json(transformedProducts);

  } catch (error) {
    console.error('Error in staff products GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
