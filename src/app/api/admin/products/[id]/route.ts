import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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
    const { name, description, price, category_id, image_url, nutrition } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Update product
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        price: price,
        category_id: category_id || null,
        image_url: image_url || null,
        nutrition: nutrition || null
      })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    const { id } = await params;

    // Delete product
    const { error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
