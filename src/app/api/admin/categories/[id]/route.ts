import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../../lib/supabase';
import type { Category } from '../../../../../../lib/supabase';

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
    const { name, description } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Update category in Supabase
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({
        name: name.trim(),
        description: description?.trim() || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user can only edit their own categories
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      category: data,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
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

    // Check if category has products
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (productsError) {
      console.error('Error checking products:', productsError);
      return NextResponse.json(
        { error: 'Failed to check category dependencies' },
        { status: 500 }
      );
    }

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with products. Please move or delete products first.' },
        { status: 400 }
      );
    }

    // Delete category from Supabase
    const { data, error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user can only delete their own categories
      .select()
      .single();

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      category: data,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}