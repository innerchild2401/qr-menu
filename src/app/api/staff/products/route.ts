import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    // Get staff user from request headers (set by middleware)
    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff user's accessible categories
    const { data: categories } = await supabase
      .rpc('get_user_categories', { user_id: staffUserId });

    if (!categories || categories.length === 0) {
      return NextResponse.json([]);
    }

    const categoryIds = categories.map((c: { category_id: number }) => c.category_id);

    // Get products from accessible categories
    const { data: products, error } = await supabase
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
