import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Get products from Supabase with category information
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories(name)
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: true });

    if (productsError) {
      console.error('Supabase error:', productsError);
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
    const { name, description, price, image_url, nutrition, category_id } = await request.json();

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

    // Validate category exists and belongs to user's restaurant
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

    // Insert new product
    const { data: newProduct, error: insertError } = await supabaseAdmin
      .from('products')
      .insert({
        restaurant_id: restaurant.id,
        category_id: category_id || null,
        name: name.trim(),
        description: description?.trim() || '',
        price: price,
        image_url: image_url || null,
        nutrition: nutrition || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
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