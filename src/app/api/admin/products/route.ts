import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../lib/supabase-server';
import type { Product } from '../../../../../lib/supabase-server';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get products from Supabase with category information
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories(name)
      `)
      .eq('restaurant_id', restaurant.id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    const { name, description, price, image, nutrition, category_id } = await request.json();

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

    // Validate category exists
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

    // Note: sort_order column doesn't exist in actual schema
    // Using created_at for ordering instead

    // Insert new product
    const { data: newProduct, error } = await supabaseAdmin
      .from('products')
      .insert({
        restaurant_id: restaurant.id,
        category_id: category_id || null,
        name: name.trim(),
        description: description?.trim() || '',
        price: price,
        image_url: image || null, // Use image_url instead of image
        nutrition: nutrition || null
        // Note: available and sort_order columns don't exist in actual schema
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      product: newProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}