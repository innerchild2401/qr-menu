import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../../lib/supabase-server';
import type { Product } from '../../../../../../lib/supabase-server';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { name, description, price, image, nutrition, category_id, available } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    // Validate category exists if provided
    if (category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('id', category_id)
        .eq('restaurant_id', restaurant.id)
        .single();

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    // Update product in Supabase
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        name: name.trim(),
        description: description?.trim() || '',
        price: price,
        image_url: image || null, // Use image_url instead of image
        nutrition: nutrition || null,
        category_id: category_id || null
        // Note: available and updated_at columns don't exist in actual schema
      })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user can only edit their own products
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      product: data,
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
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Delete product from Supabase
    const { data, error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user can only delete their own products
      .select()
      .single();

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      product: data,
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