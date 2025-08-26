import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../../../lib/api-route-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { available } = body;

    if (typeof available !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { id: productId } = await params;

    // Update product visibility
    const { data: product, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ available })
      .eq('id', productId)
      .eq('restaurant_id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating product visibility:', updateError);
      return NextResponse.json({ error: 'Failed to update product visibility' }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Product visibility updated successfully',
      product 
    });

  } catch (error) {
    console.error('Error updating product visibility:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
