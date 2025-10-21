import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Get product
    const { data: product, error } = await supabase
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
      .eq('id', resolvedParams.id)
      .eq('available', true)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if staff user has access to this category
    const { data: hasAccess } = await supabase
      .rpc('can_user_edit_category', { 
        user_id: staffUserId, 
        category_id: product.category_id 
      });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      ...product,
      category_name: product.categories?.[0]?.name || null
    });

  } catch (error) {
    console.error('Error in staff product GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { recipe } = await request.json();

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

    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff user info
    const { data: staffUser } = await supabase
      .from('staff_users')
      .select('id, name, restaurant_id')
      .eq('id', staffUserId)
      .single();

    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    const resolvedParams = await params;
    
    // Update product recipe
    const { data: product, error } = await supabase
      .from('products')
      .update({
        recipe,
        has_recipe: recipe && recipe.length > 0,
        last_modified_by: staffUserId,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    // Log the activity
    await supabase
      .from('staff_activity_log')
      .insert({
        staff_user_id: staffUserId,
        action: 'edit_recipe',
        product_id: parseInt(resolvedParams.id),
        details: { 
          changes: 'Recipe updated',
          staff_name: staffUser.name
        }
      });

    return NextResponse.json(product);

  } catch (error) {
    console.error('Error in staff product PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
