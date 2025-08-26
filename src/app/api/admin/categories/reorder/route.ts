import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';

export async function PUT(request: NextRequest) {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for current user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { categories } = body;

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update each category's sort_order
    for (const category of categories) {
      const { error: updateError } = await supabaseAdmin
        .from('categories')
        .update({ sort_order: category.sort_order })
        .eq('id', category.id)
        .eq('restaurant_id', restaurant.id);

      if (updateError) {
        console.error('Error updating category sort order:', updateError);
        return NextResponse.json({ error: 'Failed to update category order' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Categories reordered successfully',
      categories 
    });

  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
