import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';

export async function PUT(request: NextRequest): Promise<NextResponse> {
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

    // Parse request body
    const { products } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Invalid products data' },
        { status: 400 }
      );
    }

    // Update sort_order for all products
    const updatePromises = products.map((product: { id: string; sort_order: number }) => 
      supabaseAdmin
        .from('products')
        .update({ sort_order: product.sort_order })
        .eq('id', product.id)
        .eq('restaurant_id', restaurant.id)
    );

    const results = await Promise.all(updatePromises);
    
    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Errors updating products:', errors);
      return NextResponse.json(
        { error: 'Failed to update some products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Products reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
