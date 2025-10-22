import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get staff user from request headers
    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff user info to verify they exist
    const { data: staffUser, error: staffError } = await supabaseAdmin
      .from('staff_users')
      .select('id, name, restaurant_id')
      .eq('id', staffUserId)
      .single();

    if (staffError || !staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    // Get draft recipes (recipe approvals) submitted by this staff user
    const { data: draftRecipes, error: draftError } = await supabaseAdmin
      .from('recipe_approvals')
      .select(`
        id,
        product_id,
        proposed_recipe,
        current_recipe,
        status,
        admin_notes,
        created_at,
        reviewed_at,
        products!inner(
          id,
          name,
          category_id,
          categories(
            id,
            name
          )
        )
      `)
      .eq('staff_user_id', staffUserId)
      .order('created_at', { ascending: false });

    if (draftError) {
      console.error('Error fetching draft recipes:', draftError);
      return NextResponse.json({ error: 'Failed to fetch draft recipes' }, { status: 500 });
    }

    // Transform the data to make it more usable
    const transformedDrafts = draftRecipes?.map(draft => {
      const product = Array.isArray(draft.products) ? draft.products[0] : draft.products;
      const category = Array.isArray(product?.categories) ? product?.categories[0] : product?.categories;
      
      return {
        id: draft.id,
        product_id: draft.product_id,
        product_name: product?.name || 'Unknown Product',
        category_name: category?.name || 'Unknown Category',
        proposed_recipe: draft.proposed_recipe,
        current_recipe: draft.current_recipe,
        status: draft.status,
        admin_notes: draft.admin_notes,
        created_at: draft.created_at,
        reviewed_at: draft.reviewed_at
      };
    }) || [];

    return NextResponse.json(transformedDrafts);

  } catch (error) {
    console.error('Error in staff draft recipes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
